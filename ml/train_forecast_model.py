# ============================================================
# SMART GRID LOAD FORECASTING + EFFICIENCY ANALYSIS
# Dataset : smart_grid_dataset.csv  (50,001 rows × 16 cols)
# Output  : ml/forecast_model.pkl  (XGBRegressor)
#           ml/scaler.pkl           (StandardScaler  — optional)
#           ml/plots/               (4 PNG files)
# ============================================================
# Install deps (once):
#   pip install xgboost scikit-learn pandas numpy matplotlib joblib
# ============================================================

import os
import pandas as pd
import numpy as np
import matplotlib
matplotlib.use("Agg")           # headless — saves to file, no GUI needed
import matplotlib.pyplot as plt
import joblib

from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from xgboost import XGBRegressor

# ─── Paths ──────────────────────────────────────────────────
SCRIPT_DIR  = os.path.dirname(os.path.abspath(__file__))
DATASET_PATH = os.path.join(SCRIPT_DIR, "..", "smart_grid_dataset.csv")
MODEL_PATH  = os.path.join(SCRIPT_DIR, "forecast_model.pkl")
PLOTS_DIR   = os.path.join(SCRIPT_DIR, "plots")
os.makedirs(PLOTS_DIR, exist_ok=True)

# ============================================================
# 1️⃣  LOAD DATA
# ============================================================
print("📂 Loading dataset...")
df = pd.read_csv(DATASET_PATH)
print(f"   Rows: {len(df):,}   Cols: {df.shape[1]}")

df["Timestamp"] = pd.to_datetime(df["Timestamp"])
df = df.sort_values("Timestamp").reset_index(drop=True)

# ============================================================
# 2️⃣  FEATURE ENGINEERING
# ============================================================
print("⚙️  Engineering features...")

# Time features
df["hour"]      = df["Timestamp"].dt.hour
df["dayofweek"] = df["Timestamp"].dt.dayofweek
df["month"]     = df["Timestamp"].dt.month
df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)

# Lag features (next 15-min forecast → shift by 1 interval = 15 min)
df["power_lag_1"] = df["Power Consumption (kW)"].shift(1)
df["power_lag_2"] = df["Power Consumption (kW)"].shift(2)
df["power_lag_4"] = df["Power Consumption (kW)"].shift(4)   # 1-hour lag

# Rolling features (1 hour = 4 × 15-min intervals)
df["power_roll_mean_1h"] = df["Power Consumption (kW)"].rolling(window=4).mean()
df["power_roll_std_1h"]  = df["Power Consumption (kW)"].rolling(window=4).std()
df["power_roll_max_1h"]  = df["Power Consumption (kW)"].rolling(window=4).max()

# Drop NaN rows introduced by shift/rolling
df.dropna(inplace=True)
print(f"   Rows after dropna: {len(df):,}")

# ============================================================
# 3️⃣  LOAD FORECASTING (Next 15 Minutes)
# ============================================================
FEATURES = [
    "Voltage (V)",
    "Current (A)",
    "Reactive Power (kVAR)",
    "Power Factor",
    "hour",
    "dayofweek",
    "month",
    "is_weekend",
    "power_lag_1",
    "power_lag_2",
    "power_lag_4",
    "power_roll_mean_1h",
    "power_roll_std_1h",
    "power_roll_max_1h",
]

TARGET = "Power Consumption (kW)"

X = df[FEATURES]
y = df[TARGET]

# Time-based split — critical for time-series (no shuffle!)
X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, shuffle=False
)
print(f"\n📊 Train size: {len(X_train):,}   Test size: {len(X_test):,}")

# ============================================================
# 4️⃣  TRAIN MODEL
# ============================================================
print("\n🤖 Training XGBRegressor …")
model = XGBRegressor(
    n_estimators=300,
    learning_rate=0.05,
    max_depth=5,
    subsample=0.8,
    colsample_bytree=0.8,
    random_state=42,
    n_jobs=-1,
)
model.fit(
    X_train, y_train,
    eval_set=[(X_test, y_test)],
    verbose=50,
)
print("✅ Training complete.")

# ============================================================
# 5️⃣  EVALUATE
# ============================================================
y_pred = model.predict(X_test)

mae_val  = mean_absolute_error(y_test, y_pred)
rmse_val = np.sqrt(mean_squared_error(y_test, y_pred))
r2_val   = r2_score(y_test, y_pred)

print("\n=========== LOAD FORECASTING RESULTS ===========")
print(f"MAE  : {mae_val:.4f} kW")
print(f"RMSE : {rmse_val:.4f} kW")
print(f"R²   : {r2_val:.4f}  ({r2_val*100:.2f}%)")
print("=================================================")

# ============================================================
# 6️⃣  SAVE MODEL
# ============================================================
joblib.dump(model, MODEL_PATH)
print(f"\n💾 Model saved → {MODEL_PATH}")

# ============================================================
# 7️⃣  EFFICIENCY ANALYSIS
# ============================================================
print("\n=========== EFFICIENCY ANALYSIS ===========")

# Apparent Power  S = sqrt(P² + Q²)
df["Apparent Power (kVA)"] = np.sqrt(
    df["Power Consumption (kW)"]**2 + df["Reactive Power (kVAR)"]**2
)

LOW_PF_THRESHOLD = 0.85
df["Low_PF_Flag"] = df["Power Factor"] < LOW_PF_THRESHOLD
low_pf_pct = (df["Low_PF_Flag"].sum() / len(df)) * 100

print(f"Average Power Factor         : {df['Power Factor'].mean():.3f}")
print(f"Low PF (<{LOW_PF_THRESHOLD}) Occurrence : {low_pf_pct:.2f}%")
print(f"Average Apparent Power (kVA) : {df['Apparent Power (kVA)'].mean():.3f}")
print(f"Average Voltage (V)          : {df['Voltage (V)'].mean():.2f}")
print(f"Voltage Std Dev (V)          : {df['Voltage (V)'].std():.3f}")

# ============================================================
# 8️⃣  DAILY PEAK LOAD
# ============================================================
print("\n=========== DAILY PEAK LOAD (first 10 days) ===========")
daily_peak = df.resample("D", on="Timestamp")["Power Consumption (kW)"].max()
print(daily_peak.head(10).to_string())

# ============================================================
# 9️⃣  FEATURE IMPORTANCE
# ============================================================
importances = model.feature_importances_
feat_imp = pd.Series(importances, index=FEATURES).sort_values(ascending=False)
print("\n=========== FEATURE IMPORTANCE ===========")
print(feat_imp.to_string())

# ============================================================
# 🔟  VISUALIZATIONS  (saved as PNG files)
# ============================================================
print("\n📈 Generating plots …")

# --- Plot 1: Actual vs Predicted (first 300 points) ----------
N = 300
plt.figure(figsize=(14, 5))
plt.plot(y_test.values[:N], label="Actual",    color="#22c55e", linewidth=1.5)
plt.plot(y_pred[:N],        label="Predicted", color="#8b5cf6",
         linewidth=1.5, linestyle="--", alpha=0.85)
plt.title("Load Forecasting — Actual vs Predicted (Next 15 min)", fontsize=14)
plt.xlabel("Time Interval (×15 min)")
plt.ylabel("Power Consumption (kW)")
plt.legend()
plt.tight_layout()
p1 = os.path.join(PLOTS_DIR, "01_actual_vs_predicted.png")
plt.savefig(p1, dpi=150)
plt.close()
print(f"   Saved → {p1}")

# --- Plot 2: Feature Importance -------------------------------
plt.figure(figsize=(10, 6))
feat_imp.plot(kind="barh", color="#3b82f6")
plt.title("XGBoost Feature Importance", fontsize=14)
plt.xlabel("Importance Score")
plt.gca().invert_yaxis()
plt.tight_layout()
p2 = os.path.join(PLOTS_DIR, "02_feature_importance.png")
plt.savefig(p2, dpi=150)
plt.close()
print(f"   Saved → {p2}")

# --- Plot 3: Daily Peak Load ----------------------------------
plt.figure(figsize=(14, 4))
daily_peak.plot(color="#f97316", linewidth=1.5, marker="o", markersize=3)
plt.title("Daily Peak Load (kW)", fontsize=14)
plt.xlabel("Date")
plt.ylabel("Peak Power (kW)")
plt.grid(alpha=0.3)
plt.tight_layout()
p3 = os.path.join(PLOTS_DIR, "03_daily_peak_load.png")
plt.savefig(p3, dpi=150)
plt.close()
print(f"   Saved → {p3}")

# --- Plot 4: Power Factor Distribution -----------------------
plt.figure(figsize=(10, 4))
df["Power Factor"].hist(bins=60, color="#8b5cf6", edgecolor="none", alpha=0.8)
plt.axvline(LOW_PF_THRESHOLD, color="red", linestyle="--",
            linewidth=1.5, label=f"Threshold ({LOW_PF_THRESHOLD})")
plt.axvline(df["Power Factor"].mean(), color="#22c55e", linestyle="-",
            linewidth=1.5, label=f"Mean ({df['Power Factor'].mean():.3f})")
plt.title("Power Factor Distribution", fontsize=14)
plt.xlabel("Power Factor")
plt.ylabel("Count")
plt.legend()
plt.tight_layout()
p4 = os.path.join(PLOTS_DIR, "04_power_factor_distribution.png")
plt.savefig(p4, dpi=150)
plt.close()
print(f"   Saved → {p4}")

print("\n✅ System Execution Complete")
print(f"   Model  : {MODEL_PATH}")
print(f"   Plots  : {PLOTS_DIR}/")
print(f"   MAE={mae_val:.4f} kW  |  RMSE={rmse_val:.4f} kW  |  R²={r2_val:.4f}")
