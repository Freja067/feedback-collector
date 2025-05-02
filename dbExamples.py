import duckdb

# Connect to the database (change the path if needed)
con = duckdb.connect("feedback_data.duckdb")

resultFB = con.execute("SELECT * FROM feedback LIMIT 5").fetchdf()

print(resultFB)

# Example query: Show the first 5 rows from a table
resultBL = con.execute("SELECT * FROM build_logs LIMIT 5").fetchdf()

print(resultBL)


tables = con.execute("SHOW TABLES").fetchall()
print(tables)
