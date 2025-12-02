#!/usr/bin/env python3
import pandas as pd

df = pd.read_excel("/app/ETARI_Final_Submission (2).xlsx")

# Check questions 1, 3, 18, 28
for q_num in [1, 3, 18, 28]:
    q = df.iloc[q_num - 1]
    paths = str(q["مسار الملفات المعتمدة"])

    print(f"\n{'='*60}")
    print(f"Question {q_num}:")

    if paths and paths != "nan":
        path_list = [p.strip() for p in paths.split("||") if p.strip()]
        print(f"  Total files listed: {len(path_list)}")

        # Show first 3 paths
        for i, p in enumerate(path_list[:3]):
            print(f"  Path {i+1}: {p}")
    else:
        print("  No paths in Excel")
