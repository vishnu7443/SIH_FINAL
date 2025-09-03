import pandas as pd
import os

def load_dataset():
    base_dir = os.path.dirname(os.path.abspath(__file__))  # app/
    data_path = os.path.join(base_dir, "data", "clean_health_chatbot_dataset.csv")

    try:
        if not os.path.exists(data_path):
            print(f"❌ Dataset not found at {data_path}")
            return pd.DataFrame()

        # Force consistent 5 columns, fill missing with empty
        df = pd.read_csv(
            data_path,
            header=None,
            names=["question", "answer", "category", "source", "extra"],
            usecols=[0,1,2,3,4],   # only keep 5 cols
            on_bad_lines="skip",   # skip broken rows
            encoding="utf-8"
        )

        if df.empty:
            print("⚠️ Dataset is empty!")
            return pd.DataFrame()

        print(f"✅ Dataset cleaned and loaded with {df.shape[0]} rows")
        return df

    except Exception as e:
        print(f"❌ Error loading dataset: {e}")
        return pd.DataFrame()
