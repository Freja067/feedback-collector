import duckdb
import pandas as pd
import json
import os

# Path to your ndjson file
ndjson_path = 'dist/feedback-collector.ndjson'
build_logs_folder = 'dist/'  # or wherever your .txt files are

# Load NDJSON file into a list of JSON objects
with open(ndjson_path, 'r') as f:
    ndjson_data = [json.loads(line) for line in f if line.strip()]

# Convert to DataFrame
feedback_df = pd.DataFrame(ndjson_data)

# Connect to DuckDB (creates a file-based DB or in-memory if ':memory:')
con = duckdb.connect("feedback_data.duckdb")

# Write feedback data into DuckDB
con.execute("CREATE TABLE IF NOT EXISTS feedback AS SELECT * FROM feedback_df")
con.execute("INSERT INTO feedback SELECT * FROM feedback_df")

# Read and insert each .txt build log file as a single row
build_logs = []
for filename in os.listdir(build_logs_folder):
    if filename.startswith("build-logs") and filename.endswith(".txt"):
        with open(os.path.join(build_logs_folder, filename), 'r') as f:
            content = f.read()
            build_logs.append({
                "filename": filename,
                "log": content
            })

# Convert to DataFrame and insert
build_df = pd.DataFrame(build_logs)
con.execute("CREATE TABLE IF NOT EXISTS build_logs AS SELECT * FROM build_df")
con.execute("INSERT INTO build_logs SELECT * FROM build_df")

print("✅ Data successfully ingested into DuckDB.")
