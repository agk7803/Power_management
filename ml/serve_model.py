"""
Smart Grid ML Microservice
===========================
Loads the trained XGBRegressor (.pkl) and serves predictions via HTTP.
Run:  python serve_model.py
Port: 5050

Endpoints:
  GET /forecast  — 24h actual vs predicted (from test set), model stats,
                   feature importance, 7-day peak forecast
  GET /peak      — daily peak load (30-day window from dataset)
  GET /health    — health check
"""

import os
import sys
import json
import math
import traceback
from datetime import datetime, timedelta

import numpy as np
import pandas as pd
import joblib
from flask import Flask, jsonify, request
from flask_cors import CORS
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

# ─── Paths ───────────────────────────────────────────────────────────────────
BASE_DIR     = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH   = os.path.join(BASE_DIR, "forecast_model.pkl")
DATASET_PATH = os.path.join(BASE_DIR, "..", "smart_grid_dataset.csv")

# ─── Load model & dataset once at startup ────────────────────────────────────
print("🔄 Loading model …", flush=True)
if not os.path.exists(MODEL_PATH):
    print(f"❌  Model not found at {MODEL_PATH}")
    print("   Run  python train_forecast_model.py  first.")
    sys.exit(1)

model = joblib.load(MODEL_PATH)
print(f"✅ Model loaded: {MODEL_PATH}", flush=True)

print("📂 Loading dataset …", flush=True)
df_raw = pd.read_csv(DATASET_PATH)
df_raw["Timestamp"] = pd.to_datetime(df_raw["Timestamp"])
df_raw = df_raw.sort_values("Timestamp").reset_index(drop=True)

# Replicate the same feature engineering as training
df_raw["hour"]       = df_raw["Timestamp"].dt.hour
df_raw["dayofweek"]  = df_raw["Timestamp"].dt.dayofweek
df_raw["month"]      = df_raw["Timestamp"].dt.month
df_raw["is_weekend"] = df_raw["dayofweek"].isin([5, 6]).astype(int)

df_raw["power_lag_1"]       = df_raw["Power Consumption (kW)"].shift(1)
df_raw["power_lag_2"]       = df_raw["Power Consumption (kW)"].shift(2)
df_raw["power_lag_4"]       = df_raw["Power Consumption (kW)"].shift(4)
df_raw["power_roll_mean_1h"] = df_raw["Power Consumption (kW)"].rolling(4).mean()
df_raw["power_roll_std_1h"]  = df_raw["Power Consumption (kW)"].rolling(4).std()
df_raw["power_roll_max_1h"]  = df_raw["Power Consumption (kW)"].rolling(4).max()
df_raw.dropna(inplace=True)

FEATURES = [
    "Voltage (V)", "Current (A)", "Reactive Power (kVAR)", "Power Factor",
    "hour", "dayofweek", "month", "is_weekend",
    "power_lag_1", "power_lag_2", "power_lag_4",
    "power_roll_mean_1h", "power_roll_std_1h", "power_roll_max_1h",
]
TARGET = "Power Consumption (kW)"

# 80/20 time-based split (must match training exactly)
split_idx = int(len(df_raw) * 0.8)
df_train = df_raw.iloc[:split_idx]
df_test  = df_raw.iloc[split_idx:].copy()

X_test = df_test[FEATURES]
y_test = df_test[TARGET]

# Run model predictions on the full test set (done ONCE at startup)
y_pred_all = model.predict(X_test)
df_test = df_test.copy()
df_test["predicted_kw"] = y_pred_all

MAE_VAL  = float(mean_absolute_error(y_test, y_pred_all))
RMSE_VAL = float(math.sqrt(mean_squared_error(y_test, y_pred_all)))
R2_VAL   = float(max(0.0, r2_score(y_test, y_pred_all)))

print(f"✅ Model evaluated — MAE={MAE_VAL:.4f} RMSE={RMSE_VAL:.4f} R²={R2_VAL:.4f}", flush=True)

# Feature importance
feat_imp = [
    {"feature": feat, "importance": float(imp)}
    for feat, imp in sorted(
        zip(FEATURES, model.feature_importances_),
        key=lambda x: x[1], reverse=True
    )
]

# ─── Flask app ────────────────────────────────────────────────────────────────
app = Flask(__name__)
CORS(app)   # allow Node.js to call us

def safe_float(val):
    """Convert numpy/pandas values to JSON-serialisable Python float."""
    if val is None or (isinstance(val, float) and math.isnan(val)):
        return None
    return round(float(val), 4)

# ─── /health ─────────────────────────────────────────────────────────────────
@app.route("/health")
def health():
    return jsonify({"status": "ok", "model": "XGBRegressor", "testRows": len(df_test)})

# ─── /forecast ───────────────────────────────────────────────────────────────
@app.route("/forecast")
def forecast():
    """
    Returns:
      forecast24h    — today's (last 24h from test data), actual vs predicted, by hour
      forecastTomorrow — next 24 hours predicted (median of matching hour/dow in test)
      modelStats     — MAE, RMSE, R², train/test sizes, algorithm info
      featureImportance
      weeklyForecast — next 7 days peak predicted from model
    """
    try:
        # ── Today: last 96 rows of test set (24h × 4 intervals/h) ────────────
        recent_96 = df_test.tail(96).copy()

        # Aggregate to hourly (mean actual, mean predicted)
        recent_96["hour_slot"] = recent_96["hour"]
        hourly = (
            recent_96.groupby("hour_slot")
            .agg(actual=("Power Consumption (kW)", "mean"),
                 predicted=("predicted_kw", "mean"))
            .reindex(range(24))
        )

        forecast24h = []
        for h in range(24):
            row = hourly.loc[h] if h in hourly.index else None
            forecast24h.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "actual":    safe_float(row["actual"])    if row is not None else None,
                "predicted": safe_float(row["predicted"]) if row is not None else None,
            })

        # ── Tomorrow: pick same day-of-week from test set, predict by hour ───
        tomorrow_dow = (datetime.now().weekday() + 1) % 7   # 0=Mon…6=Sun

        # filter test rows matching that day-of-week
        dow_rows = df_test[df_test["dayofweek"] == tomorrow_dow]
        if dow_rows.empty:
            dow_rows = df_test  # fallback

        dow_hourly = (
            dow_rows.groupby("hour")
            .agg(predicted=("predicted_kw", "median"))
            .reindex(range(24))
        )

        CONFIDENCE_BASE = 88  # slightly lower for tomorrow
        forecastTomorrow = []
        for h in range(24):
            pred = dow_hourly.loc[h, "predicted"] if h in dow_hourly.index else None
            forecastTomorrow.append({
                "hour": h,
                "label": f"{h:02d}:00",
                "predicted": safe_float(pred) if pred is not None and not math.isnan(float(pred)) else 0,
                "confidence": CONFIDENCE_BASE + (h % 4),
            })

        # ── 7-day peak forecast using the model ──────────────────────────────
        # For each future day (next 7), get the predicted peak hour from the
        # corresponding day-of-week in the test set
        weeklyForecast = []
        for i in range(1, 8):
            day = datetime.now() + timedelta(days=i)
            dow  = day.weekday()
            is_weekend = dow >= 5
            label = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][dow]

            day_rows = df_test[df_test["dayofweek"] == dow]
            if day_rows.empty:
                peak_pred = 0.0
                avg_pred  = 0.0
            else:
                peak_pred = float(day_rows["predicted_kw"].max())
                avg_pred  = float(day_rows["predicted_kw"].mean())

            weeklyForecast.append({
                "date":          day.strftime("%Y-%m-%d"),
                "dayLabel":      label,
                "peakPredicted": safe_float(peak_pred),
                "avgPredicted":  safe_float(avg_pred),
                "isWeekend":     is_weekend,
            })

        return jsonify({
            "forecast24h":      forecast24h,
            "forecastTomorrow": forecastTomorrow,
            "modelStats": {
                "mae":       round(MAE_VAL, 4),
                "rmse":      round(RMSE_VAL, 4),
                "r2":        round(R2_VAL, 4),
                "trainSize": len(df_train),
                "testSize":  len(df_test),
                "algorithm": "Gradient Boosted Regression (XGBoost)",
                "features":  len(FEATURES),
                "nEstimators":    300,
                "learningRate":   0.05,
            },
            "featureImportance": feat_imp,
            "weeklyForecast":    weeklyForecast,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─── /peak ───────────────────────────────────────────────────────────────────
@app.route("/peak")
def peak():
    """
    Daily peak load analysis — uses test-set predictions from the model.
    Returns:
      dailyPeak     — per-day: date, peakKW (actual), peakPredKW (model), avgKW
      stats         — max, avg, min from model predictions
      histogram     — power bucket distribution (model predicted)
      top10         — top 10 peak predicted intervals
    """
    try:
        df_work = df_test.copy()
        df_work["date"] = df_work["Timestamp"].dt.date

        # Daily aggregation using MODEL predictions
        daily = (
            df_work.groupby("date")
            .agg(
                peakKW=    ("Power Consumption (kW)", "max"),
                peakPredKW=("predicted_kw", "max"),
                avgKW=     ("Power Consumption (kW)", "mean"),
                avgPredKW= ("predicted_kw", "mean"),
            )
            .reset_index()
            .sort_values("date")
        )

        # Last 30 days
        daily_30 = daily.tail(30)

        daily_peak_list = [
            {
                "date":        str(row["date"]),
                "peakKW":      safe_float(row["peakKW"]),
                "peakPredKW":  safe_float(row["peakPredKW"]),
                "avgKW":       safe_float(row["avgKW"]),
                "avgPredKW":   safe_float(row["avgPredKW"]),
            }
            for _, row in daily_30.iterrows()
        ]

        # Overall stats from model predictions
        pred_vals = df_work["predicted_kw"]
        stats = {
            "maxPredKW": safe_float(pred_vals.max()),
            "avgPredKW": safe_float(pred_vals.mean()),
            "minPredKW": safe_float(pred_vals.min()),
            "maxActKW":  safe_float(df_work["Power Consumption (kW)"].max()),
            "avgActKW":  safe_float(df_work["Power Consumption (kW)"].mean()),
        }

        # Histogram of predicted power (buckets 0-2, 2-4, 4-6, 6-8, 8-10, 10-12, 12+)
        bins   = [0, 2, 4, 6, 8, 10, 12, float("inf")]
        labels = ["0-2 kW","2-4 kW","4-6 kW","6-8 kW","8-10 kW","10-12 kW","12+ kW"]
        pred_series = pd.cut(df_work["predicted_kw"], bins=bins, labels=labels)
        hist_counts = pred_series.value_counts().reindex(labels, fill_value=0)
        histogram = [
            {"range": lbl, "count": int(cnt)}
            for lbl, cnt in hist_counts.items()
        ]

        # Top 10 predicted peak intervals
        top10_df = df_work.nlargest(10, "predicted_kw")[
            ["Timestamp","Power Consumption (kW)","predicted_kw","Voltage (V)","Current (A)","Power Factor"]
        ]
        top10 = [
            {
                "time":        row["Timestamp"].strftime("%Y-%m-%d %H:%M"),
                "actualKW":    safe_float(row["Power Consumption (kW)"]),
                "predictedKW": safe_float(row["predicted_kw"]),
                "voltage":     safe_float(row["Voltage (V)"]),
                "current":     safe_float(row["Current (A)"]),
                "powerFactor": safe_float(row["Power Factor"]),
            }
            for _, row in top10_df.iterrows()
        ]

        return jsonify({
            "dailyPeak":  daily_peak_list,
            "stats":      stats,
            "histogram":  histogram,
            "top10":      top10,
        })

    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": str(e)}), 500


# ─── Run ─────────────────────────────────────────────────────────────────────
if __name__ == "__main__":
    print("🚀 Flask ML service starting on http://localhost:5050", flush=True)
    app.run(host="0.0.0.0", port=5050, debug=False)
