# xls_csv_2_sql

scripts to support conversion of data between

* CSV
* Excel (Saved as 2003 XML worksheet) (output and input)
* SQL INSERT script (output only)

This is a scratch project done for a specificy analysis and only taken as far as needed,
support for specific data types and or serialization formats may be missing.

## usage

````
>gulp tsc && node js\main.js -h
usage: main.js [-h] [-v] [-to OP] [-C CONNSTR] [-d SERVER] [-e ENCODING] [--noheader] [--huge] fileFolder

xls_csv_2_sql ==============================
	1) Folder containing CSV files usage node js/main.js -f myData/ 2) single
excel file, potentially multiple worksheets node js/main.js -f myData What needs to be present: 1) in the folder
respective CSV files. 2) in data/myData/ a file myData.sqlDef.json with a matching table definition. If the
SQLDefinition starts with a column WSNAME the name of the tab (or file) will be added as an extra column. If Header
names are present in

positional arguments:
  fileFolder            File (.xml=>Excel 2003 xml; .sql=>MSSQL SQL) or Folder (trailing '/')

optional arguments:
  -h, --help            show this help message and exit
  -v, --version         show program's version number and exit
  -to OP, --to OP       operation, one of SQL, JSON, EXCEL
  -C CONNSTR, --ConnStr CONNSTR
                        Conn str start "Server=XXXXX;Database=yyyyy;"
  -d SERVER, --Server SERVER
                        File (.xml=>Excel 2003 xml; .sql=>MSSQL SQL) or Folder (trailing '/')
  -e ENCODING, --enc ENCODING
                        Encoding of sql file (utf-8), (UTF16-LE)
  --noheader
  --huge

C:\progenv\nodejs\xls_csv_2_sql>
```
-to  EXCEL

## Problem 1) CSV+Excel => SQL Insert statements

 CSV and or Excel files are provided (e.g. from different data centers) containing roughtyl the same content. The data shall be collected into a single database for analysis.

=> Take Input Files(in  folders), add a column representing the DC/Filename and "canonize" into SQL INSERT statements, (yielding a consistent output independent of slight variations in input format(s) ( e.g. datetime serialization) )

There is some basic checking and error handling. (duplicate columns, unparseable rows)


## Problem 2) Generate Multi-tab-Excel from SQL statements

A normal t-SQL script (https://github.com/jfseb/xls_csv_2_sql/blob/main/srcData/COLL_ANALYZE/COLL_ANALYZE.sql) [example]
 is extented by comments with a small DSL (Domain specific language) describing

1) Worksheet (TOWS)
2) Fixed columns WSFIX
3) A comment on a column

Rows with headers in the worksheet are generated in order of query result.


```
SELECT 'DB Tables collations ...'
--TOWS:DB_TableCollations
--WSFIX:1,4
--WSCOLCOMMENT:DBCOL:"Database Collation"
--WSCOLCOMMENT:SPURIOUS:"DB may be spurious( is not in all DBs of Kind), Filter = 1"
--WSCOLCOMMENT:DB_Lat_CS:"Nr of DBs with Latin1_General_CS_AS collation"
--WSCOLCOMMENT:NRCCOL:"Nr of distinct collations (Filter > 1)"
--WSCOLCOMMENT:NRCCOLCICS:"Nr of distinct CI-CS collations (Filter > 1)"
--WSCOLCOMMENT:CCOL_Lat_CS:"Nr of Columns with Latin1_General_CS_AS collation"
--WSCOLCOMMENT:CCOL_Lat_CI:"Nr of Columns with Latin1_General_CI_AS collation"
--WSCOLCOMMENT:CCOL_SQL_CI:"Nr of Columsn with SQL_Latin1_General_CP1_CI_AS collation"
SELECT * ,
   ROW_NUMBER() OVER ( PARTITION BY  DB_KIND_NAME, TNAME, CCOL_Lat_CS, CCOL_Lat_CI, CCOL_SQL_CI
                       ORDER BY CCOL_Lat_CS, CCOL_Lat_CI, CCOL_SQL_CI ) RN
FROM [dbo].[VW_DB_TABLE_COLLATION]
 ORDER BY DB_KIND_NAME, TNAME ,  DBCOL, RN, DB_NAME
```

```
gulp tsc && node js\main.js -to EXEL -C "server=W-R90X6N83\SQL2016DEVA;Database=WFADBMD;" srcData\COLL_ANALYZE2\COLL_ANALYZE2.sql

node js\main.js  -to EXCEL srcData\USR_ROL_ANALYZE\USR_ROL_ANALYZE.sql --enc UTF-16LE -C "Server=W-R90X6N83\SQL2016DEVA;Database=WFAROLUSR;Trusted_Connection=Yes;"
```

# Tips & Tricks

##  use larger heap:

  default operations construct the full "canonic" internal document in memory.
  --huge uses a streaming approach

```
node --max_old_space_size=18192 js\main.js --huge -to SQL srcData\USR_ROL\


gulp tsc && node js\main.js -to EXEL -C "server=W-R90X6N83\SQL2016DEVA;Database=WFADBMD;" srcData\COLL_ANALYZE2\COLL_ANALYZE2.sql
```

Source file encoding (sql)

```
node js\main.js  -to EXCEL srcData\USR_ROL_ANALYZE\USR_ROL_ANALYZE.sql --enc UTF-16LE -C "Server=W-R90X6N83\SQL2016DEVA;Database=WFAROLUSR;Trusted_Connection=Yes;"
```


# example tabledef.json

## example output

```


DROP TABLE IF EXISTS [dbo].[DB_TBL_COL_COLLATION];
GO
CREATE TABLE [dbo].[DB_TBL_COL_COLLATION] (
[WSNAME] NVARCHAR(12) COLLATE database_default  NOT NULL
,[SERVERNAME] NVARCHAR(16) COLLATE database_default  NOT NULL
,[SERVERCOL] NVARCHAR(64) COLLATE database_default  NOT NULL
,[DB_NAME] NVARCHAR(32) COLLATE database_default  NOT NULL
,[DB_KIND] INT NOT NULL
,[DBCOL] NVARCHAR(64) COLLATE database_default  NOT NULL
,[TNAME] NVARCHAR(32) COLLATE database_default  NOT NULL
,[CNAME] NVARCHAR(32) COLLATE database_default  NOT NULL
,[CID] NVARCHAR NOT NULL
,[CCOL] NVARCHAR(64) COLLATE database_default  NULL
);
GO
INSERT INTO [dbo].[DB_TBL_COL_COLLATION] (WSNAME,SERVERNAME,SERVERCOL,DB_NAME,DB_KIND,DBCOL,TNAME,CNAME,CID,CCOL) VALUES (N'XX04' ,N'YYCLS51' ,N'SQL_Latin1_General_CP1_CI_AS' ,N'GDPR_DC4SalesDemo' ,64 ,N'Latin1_General_CS_AS' ,N'GDPR_LOG_READER_INFO' ,N'AUDIT_EXPORT_ID' ,1 ,NULL);
...
```

example tabledef

```
{
  "tname": "DB_TBL_COL_COLLATION",
  "cols": [
	{
		"cname" : "WSNAME",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 12,
		"ctype": "NVARCHAR"
	},
		{
		"cname" : "SERVERNAME",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 16,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "SERVERCOL",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 64,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "DB_NAME",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 32,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "DB_KIND",
		"basetype" : "INT",
		"nullable": false,
		"length" : 64,
		"ctype": "INT"
	},
	{
		"cname" : "DBCOL",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 64,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "TNAME",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 32,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "CNAME",
		"basetype" : "NVARCHAR",
		"nullable": false,
		"length" : 32,
		"ctype": "NVARCHAR"
	},
	{
		"cname" : "CID",
		"basetype" : "INT",
		"nullable": false,
		"length" : 4,
		"ctype": "INT"
	},
	{
		"cname" : "CCOL",
		"basetype" : "NVARCHAR",
		"nullable": true,
		"length" : 64,
		"ctype": "NVARCHAR"
	}
  ]
}
```