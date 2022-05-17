# xls_csv_2_sql
Generate INSERT values script for CSV/XLS (xml) data



# use larger heap:
node --max_old_space_size=18192 js\main.js --huge -to SQL srcData\USR_ROL\


gulp tsc && node js\main.js -to EXEL -C "server=W-R90X6N83\SQL2016DEVA;Database=WFADBMD;" srcData\COLL_ANALYZE2\COLL_ANALYZE2.sql



node js\main.js  -to EXCEL srcData\USR_ROL_ANALYZE\USR_ROL_ANALYZE.sql --enc UTF-16LE -C "Server=W-R90X6N83\SQL2016DEVA;Database=WFAROLUSR;Trusted_Connection=Yes;"