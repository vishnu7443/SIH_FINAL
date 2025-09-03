import pandas as pd

# Input & output paths
input_file = "backend/app/data/clean_health_chatbot_dataset.csv"
output_file = "backend/app/data/fixed_health_chatbot_dataset.csv"

# Try to read even if rows are broken
df = pd.read_csv(
    input_file,
    header=None,
    names=["question", "answer", "category", "source", "extra"],
    usecols=[0, 1, 2, 3, 4],   # force only 5 cols
    on_bad_lines="skip",
    encoding="utf-8"
)

print(f"✅ Loaded dataset with {df.shape[0]} valid rows")

# Save clean dataset
df.to_csv(output_file, index=False, encoding="utf-8")
print(f"✅ Clean dataset saved to: {output_file}")
