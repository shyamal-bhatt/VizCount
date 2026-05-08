-- 1. Create DataBase and Schema
CREATE DATABASE IF NOT EXISTS VIZCOUNT_DB;
USE DATABASE VIZCOUNT_DB;

CREATE SCHEMA IF NOT EXISTS INVENTORY_SCHEMA;
USE SCHEMA INVENTORY_SCHEMA;

-- 2. Drop and Create Tables
CREATE OR REPLACE TABLE defined_products (
    name VARCHAR,
    pid VARCHAR PRIMARY KEY,
    gtin VARCHAR,
    pack INT,
    type VARCHAR,
    shelf_life_days INT,
    created_at BIGINT,
    updated_at BIGINT
);
CREATE OR REPLACE TABLE scanned_items (
    pid VARCHAR,
    sn VARCHAR,
    name VARCHAR,
    best_before_date BIGINT,
    net_kg FLOAT,
    count INT,
    created_at BIGINT,
    updated_at BIGINT
);
CREATE OR REPLACE TABLE sales_floor (
    pid VARCHAR,
    name VARCHAR,
    count INT,
    weight FLOAT,
    expiry_date BIGINT,
    created_at BIGINT,
    updated_at BIGINT
);

-- 3. Insert into defined_products
TRUNCATE TABLE defined_products;
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME ORG WB', '31396056', NULL, 6, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('ML WHOLE WING', '31180986', NULL, 8, 'Maple Leaf Chicken', 11, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME ORG SPLT WNG', '30031863', NULL, 8, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN LG QT', '30148922', NULL, 6, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN WHOLE', '30148926', NULL, 6, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHKN DRUM', '30148672', NULL, 6, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN GRNDS', '30212214', NULL, 12, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN BSB', '31430278', NULL, 8, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL BSB VP', '31561685', NULL, 6, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN BST', '30433243', NULL, 12, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('MINA HALAL CHN THIGH', '30148828', NULL, 6, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('COHO 2PC PORTIONS', '50571637', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM BASA FILLET', '31237250', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('GOAT CUBES BONE IN', '31710966', NULL, 12, 'Halal', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AA STRIPLOIN STEAK', '50772502', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AA TRI TIP', '50772503', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AA BLADE STEAK', '50772504', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BF TRI TIP SIRLOIN', '50158149', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFSTK SRLN TIP C11YF', '30062738', NULL, 6, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFSTK INSD RND C05YF', '31742690', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFRST INSD BLD C09YF', '30512733', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR MAPLE 900ML', '31439394', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR MAPLE 375JV', '50576420', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR ORIG 375JV', '50576421', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR RND 250JV', '50576425', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR ORIG 900ML', '30347833', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR ORIG 375ML', '30010520', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG BR MAPLE 375ML', '30010521', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('JVL BWN SUG HON', '50576373', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG DN MLDIT 500JV', '50576422', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG DN HOTIT 500JV', '50576423', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG DN BRAT 500JV', '50576424', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKSSG GR MLDIT 454JV', '50576427', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKRIB BACK C10ML', '50194696', NULL, 4, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKRIB SIDE C18ML', '50194698', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKRIB SWEETNSR C18ML', '50194701', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PORK SIDE RIBS', '30794606', NULL, 9, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKGRD LEAN 454ML', '31034407', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKGRD LEAN 454MR', '50177843', NULL, 12, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKGRD LEAN 1.36ML', '30438002', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PK MEATBALL 375YF', '30831611', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PK BELLY BL C09MR', '50600221', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKRIB SWEETNSR C18MR', '50600224', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP FST FRY COBMR', '50177806', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP CTR RIB C14ML', '50177839', NULL, 4, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP BL CC RB C08ML', '50725724', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP COMBO C15ML', '50191456', NULL, 4, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP BL CC RB C08MR', '50742149', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP CTRB BI C08ML', '50194643', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKCHP CTRB BI C08MR', '50194684', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PK HALF LOIN', '30426668', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PK TNDRLN C12FL', '31330154', NULL, 6, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PKRST BLD BL C13ML', '30512791', NULL, 8, 'Pork', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFSTK INS ROUND HL', '50617592', NULL, 4, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME RWA THIN SLICD', '30388227', NULL, 8, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME RWA BSB', '31311643', NULL, 12, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME RWA BSB VP', '31052846', NULL, 6, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME ORG BSB', '31396049', NULL, 8, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PR RWA DICED CHK', '50714850', NULL, 8, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('PRIME RWA BST', '30489356', NULL, 12, 'Organic Chicken', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('ML CKN BSB VP', '30798737', NULL, 6, 'Maple Leaf Chicken', 11, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('ML CKN BRST BNLSKNLS', '9314778', NULL, 8, 'Maple Leaf Chicken', 11, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('ML CHKN DRUMS VP', '30096145', NULL, 6, 'Maple Leaf Chicken', 11, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('ML CHKN THIGHS VP', '30096200', NULL, 6, 'Maple Leaf Chicken', 11, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFRST SRLN TIP C10YF', '30512743', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD XLEAN C14YF', '30910241', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD MEDIUM C14YF', '30054234', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD MEDIUM 454YF', '30231907', NULL, 12, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD LEAN 454YF', '30231908', NULL, 12, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD LEAN C14YF', '30053516', NULL, 8, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BF MEATBALL', '30831503', NULL, 6, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD XLEAN 454YF', '30232055', NULL, 12, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD REGULAR TB1YF', '31637355', NULL, 30, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD LEAN TB1YF', '31637357', NULL, 30, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('BFGRD LEAN TB1YF', '30700923', NULL, 30, 'Beef', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AQMR SURIMI FLAKE1KG', '30423042', NULL, 10, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AQMR SURIMI FLAKE340', '30953524', NULL, 12, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('AQMR SURIMI STICK340', '30953525', NULL, 12, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM SLMN ATL PTN 2PC', '30133763', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM SWT SMKY COHO', '50712337', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM ATL SLMN W/BUTR', '50712345', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM LMN HRB COHO', '50712348', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM SLMN COHO FILLET', '31237716', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM RAINBW TROUT FLT', '31237972', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM TILAPIA FILLET', '31237984', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);
INSERT INTO defined_products (name, pid, gtin, pack, type, shelf_life_days, created_at, updated_at) VALUES ('YFM SLMN ATLANTIC PTN', '31236718', NULL, 6, 'Seafood', NULL, 1777565596295, 1777565596295);

-- 4. Insert dummy data into scanned_items (Cooler)
TRUNCATE TABLE scanned_items;
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30512733', 'SN336522', 'BFRST INSD BLD C09YF', 1777997596295, 7.73, 45, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712345', 'SN538213', 'YFM ATL SLMN W/BUTR', 1778343196295, 6.82, 28, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712337', 'SN819409', 'YFM SWT SMKY COHO', 1778170396295, 3.93, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31742690', 'SN408387', 'BFSTK INSD RND C05YF', 1777824796295, 1.88, 15, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30831503', 'SN376846', 'BF MEATBALL', 1778170396295, 9.89, 35, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30231908', 'SN129391', 'BFGRD LEAN 454YF', 1778170396295, 1.49, 14, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31311643', 'SN705399', 'PRIME RWA BSB', 1777824796295, 2.21, 41, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237250', 'SN817803', 'YFM BASA FILLET', 1778170396295, 7.79, 20, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50158149', 'SN763483', 'BF TRI TIP SIRLOIN', 1778170396295, 7.5, 25, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30231908', 'SN344570', 'BFGRD LEAN 454YF', 1777997596295, 3.21, 39, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30148926', 'SN972472', 'MINA HALAL CHN WHOLE', 1777911196295, 9.46, 11, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50742149', 'SN841417', 'PKCHP BL CC RB C08MR', 1777911196295, 1.8, 38, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31236718', 'SN979810', 'YFM SLMN ATLANTIC PTN', 1777651996295, 8.44, 37, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50742149', 'SN833588', 'PKCHP BL CC RB C08MR', 1778170396295, 8.9, 30, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576425', 'SN154135', 'PKSSG BR RND 250JV', 1778343196295, 6.24, 50, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31330154', 'SN470342', 'PK TNDRLN C12FL', 1777738396295, 6.72, 10, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30010521', 'SN379247', 'PKSSG BR MAPLE 375ML', 1778343196295, 9.03, 22, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576373', 'SN245524', 'JVL BWN SUG HON', 1777997596295, 1.44, 13, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31034407', 'SN815320', 'PKGRD LEAN 454ML', 1777738396295, 6.14, 36, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576420', 'SN230313', 'PKSSG BR MAPLE 375JV', 1777651996295, 7.33, 46, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30831611', 'SN719027', 'PK MEATBALL 375YF', 1778083996295, 2.0, 11, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31330154', 'SN551187', 'PK TNDRLN C12FL', 1777738396295, 5.08, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31052846', 'SN663600', 'PRIME RWA BSB VP', 1778083996295, 4.44, 18, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576421', 'SN798865', 'PKSSG BR ORIG 375JV', 1778170396295, 8.8, 20, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30831503', 'SN642423', 'BF MEATBALL', 1778343196295, 8.27, 29, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237984', 'SN734144', 'YFM TILAPIA FILLET', 1777651996295, 8.57, 15, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30096145', 'SN300298', 'ML CHKN DRUMS VP', 1778343196295, 7.01, 44, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30433243', 'SN730359', 'MINA HALAL CHN BST', 1777824796295, 3.21, 31, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576420', 'SN812910', 'PKSSG BR MAPLE 375JV', 1778083996295, 4.42, 33, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712348', 'SN697186', 'YFM LMN HRB COHO', 1778170396295, 3.05, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237716', 'SN717216', 'YFM SLMN COHO FILLET', 1778083996295, 7.64, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576427', 'SN141799', 'PKSSG GR MLDIT 454JV', 1777738396295, 4.15, 48, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31742690', 'SN293241', 'BFSTK INSD RND C05YF', 1778343196295, 5.56, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31710966', 'SN786026', 'GOAT CUBES BONE IN', 1778083996295, 3.71, 26, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50742149', 'SN834966', 'PKCHP BL CC RB C08MR', 1777997596295, 5.66, 8, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30133763', 'SN239489', 'YFM SLMN ATL PTN 2PC', 1778429596295, 4.92, 12, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30426668', 'SN702665', 'PK HALF LOIN', 1778083996295, 6.29, 48, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30953525', 'SN426241', 'AQMR SURIMI STICK340', 1778083996295, 6.07, 40, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50600224', 'SN728352', 'PKRIB SWEETNSR C18MR', 1778429596295, 5.86, 45, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30423042', 'SN998022', 'AQMR SURIMI FLAKE1KG', 1778343196295, 9.24, 19, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31311643', 'SN574622', 'PRIME RWA BSB', 1778083996295, 1.45, 22, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30148828', 'SN363497', 'MINA HALAL CHN THIGH', 1777824796295, 1.16, 14, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576420', 'SN156050', 'PKSSG BR MAPLE 375JV', 1778343196295, 4.23, 26, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30426668', 'SN476358', 'PK HALF LOIN', 1777997596295, 1.31, 10, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50576424', 'SN720286', 'PKSSG DN BRAT 500JV', 1777911196295, 3.0, 47, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50194643', 'SN139097', 'PKCHP CTRB BI C08ML', 1778170396295, 7.88, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237984', 'SN883510', 'YFM TILAPIA FILLET', 1778170396295, 4.04, 35, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31430278', 'SN939606', 'MINA HALAL CHN BSB', 1778343196295, 9.9, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50191456', 'SN465349', 'PKCHP COMBO C15ML', 1778343196295, 4.63, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50600224', 'SN485315', 'PKRIB SWEETNSR C18MR', 1777824796295, 3.36, 45, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31180986', 'SN614092', 'ML WHOLE WING', 1777738396295, 3.73, 13, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712345', 'SN438254', 'YFM ATL SLMN W/BUTR', 1778343196295, 3.94, 19, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50158149', 'SN532563', 'BF TRI TIP SIRLOIN', 1777738396295, 2.45, 31, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30512743', 'SN557825', 'BFRST SRLN TIP C10YF', 1778083996295, 6.61, 32, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50194696', 'SN298363', 'PKRIB BACK C10ML', 1778256796295, 4.98, 50, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712345', 'SN841868', 'YFM ATL SLMN W/BUTR', 1777911196295, 9.59, 13, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30212214', 'SN148319', 'MINA HALAL CHN GRNDS', 1777651996295, 4.86, 13, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50617592', 'SN359897', 'BFSTK INS ROUND HL', 1778170396295, 2.74, 41, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30010521', 'SN861294', 'PKSSG BR MAPLE 375ML', 1778083996295, 4.32, 38, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31311643', 'SN663439', 'PRIME RWA BSB', 1777824796295, 3.97, 13, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31180986', 'SN516111', 'ML WHOLE WING', 1777651996295, 2.12, 46, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50772502', 'SN637285', 'AA STRIPLOIN STEAK', 1777911196295, 5.27, 27, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30096200', 'SN125260', 'ML CHKN THIGHS VP', 1777651996295, 5.65, 44, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50194701', 'SN122678', 'PKRIB SWEETNSR C18ML', 1778256796295, 1.06, 47, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('9314778', 'SN837110', 'ML CKN BRST BNLSKNLS', 1777997596295, 8.12, 40, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237972', 'SN799865', 'YFM RAINBW TROUT FLT', 1778429596295, 4.48, 16, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31180986', 'SN787119', 'ML WHOLE WING', 1778256796295, 4.86, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50617592', 'SN197395', 'BFSTK INS ROUND HL', 1778429596295, 2.09, 22, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30426668', 'SN334588', 'PK HALF LOIN', 1778343196295, 4.77, 5, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31430278', 'SN449447', 'MINA HALAL CHN BSB', 1778429596295, 3.38, 46, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30489356', 'SN938108', 'PRIME RWA BST', 1777997596295, 1.84, 42, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237984', 'SN792136', 'YFM TILAPIA FILLET', 1778170396295, 8.39, 41, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30148926', 'SN395315', 'MINA HALAL CHN WHOLE', 1777997596295, 6.58, 26, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30512791', 'SN365248', 'PKRST BLD BL C13ML', 1777738396295, 7.04, 27, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31311643', 'SN596207', 'PRIME RWA BSB', 1777651996295, 6.5, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30953525', 'SN566119', 'AQMR SURIMI STICK340', 1778170396295, 7.62, 20, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50158149', 'SN503851', 'BF TRI TIP SIRLOIN', 1777911196295, 9.32, 22, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30831503', 'SN839417', 'BF MEATBALL', 1778083996295, 6.67, 42, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50712337', 'SN895718', 'YFM SWT SMKY COHO', 1777824796295, 4.43, 20, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30512791', 'SN316520', 'PKRST BLD BL C13ML', 1777824796295, 5.08, 7, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30388227', 'SN226441', 'PRIME RWA THIN SLICD', 1777738396295, 5.62, 48, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30096200', 'SN753964', 'ML CHKN THIGHS VP', 1778170396295, 6.67, 43, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30148672', 'SN572947', 'MINA HALAL CHKN DRUM', 1778170396295, 3.89, 18, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50772502', 'SN754049', 'AA STRIPLOIN STEAK', 1777738396295, 7.84, 48, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50158149', 'SN316130', 'BF TRI TIP SIRLOIN', 1777824796295, 8.48, 31, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237716', 'SN557032', 'YFM SLMN COHO FILLET', 1777911196295, 7.34, 23, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50617592', 'SN960038', 'BFSTK INS ROUND HL', 1777738396295, 5.89, 7, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50714850', 'SN508258', 'PR RWA DICED CHK', 1778429596295, 8.92, 33, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50177843', 'SN566645', 'PKGRD LEAN 454MR', 1777738396295, 5.62, 16, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31180986', 'SN171430', 'ML WHOLE WING', 1777911196295, 1.64, 7, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31237984', 'SN251558', 'YFM TILAPIA FILLET', 1778343196295, 5.57, 44, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31637355', 'SN226307', 'BFGRD REGULAR TB1YF', 1778343196295, 6.64, 17, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50600224', 'SN945446', 'PKRIB SWEETNSR C18MR', 1777911196295, 8.09, 30, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('31236718', 'SN983964', 'YFM SLMN ATLANTIC PTN', 1777651996295, 1.09, 33, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50600221', 'SN313816', 'PK BELLY BL C09MR', 1778429596295, 7.17, 28, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50194696', 'SN545584', 'PKRIB BACK C10ML', 1778343196295, 6.62, 14, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('50600221', 'SN658981', 'PK BELLY BL C09MR', 1777911196295, 2.11, 6, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30433243', 'SN765302', 'MINA HALAL CHN BST', 1778429596295, 8.08, 29, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30062738', 'SN836282', 'BFSTK SRLN TIP C11YF', 1777738396295, 7.72, 40, 1777565596295, 1777565596295);
INSERT INTO scanned_items (pid, sn, name, best_before_date, net_kg, count, created_at, updated_at) VALUES ('30347833', 'SN480744', 'PKSSG BR ORIG 900ML', 1777651996295, 9.98, 9, 1777565596295, 1777565596295);

-- 5. Insert dummy data into sales_floor (Floor counts)
TRUNCATE TABLE sales_floor;
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712348', 'YFM LMN HRB COHO', 11, 0.7, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576422', 'PKSSG DN MLDIT 500JV', 9, 4.5, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30910241', 'BFGRD XLEAN C14YF', 8, 2.23, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576421', 'PKSSG BR ORIG 375JV', 12, 2.22, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30438002', 'PKGRD LEAN 1.36ML', 14, 0.5, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31561685', 'MINA HALAL BSB VP', 20, 3.11, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50571637', 'COHO 2PC PORTIONS', 11, 4.48, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30831611', 'PK MEATBALL 375YF', 17, 2.73, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31439394', 'PKSSG BR MAPLE 900ML', 19, 2.3, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177806', 'PKCHP FST FRY COBMR', 10, 1.03, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50158149', 'BF TRI TIP SIRLOIN', 9, 4.0, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30831611', 'PK MEATBALL 375YF', 7, 3.98, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50158149', 'BF TRI TIP SIRLOIN', 9, 1.95, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50714850', 'PR RWA DICED CHK', 15, 4.34, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177839', 'PKCHP CTR RIB C14ML', 4, 1.24, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30388227', 'PRIME RWA THIN SLICD', 20, 4.47, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712348', 'YFM LMN HRB COHO', 16, 2.14, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31052846', 'PRIME RWA BSB VP', 2, 1.27, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30096200', 'ML CHKN THIGHS VP', 13, 0.52, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772504', 'AA BLADE STEAK', 17, 1.53, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50600221', 'PK BELLY BL C09MR', 9, 2.48, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712345', 'YFM ATL SLMN W/BUTR', 18, 3.89, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31237716', 'YFM SLMN COHO FILLET', 18, 3.24, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177806', 'PKCHP FST FRY COBMR', 17, 0.65, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772503', 'AA TRI TIP', 19, 0.88, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30053516', 'BFGRD LEAN C14YF', 2, 2.8, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30794606', 'PORK SIDE RIBS', 9, 3.0, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30426668', 'PK HALF LOIN', 2, 4.6, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50714850', 'PR RWA DICED CHK', 3, 2.09, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31311643', 'PRIME RWA BSB', 19, 3.64, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50571637', 'COHO 2PC PORTIONS', 4, 3.62, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576427', 'PKSSG GR MLDIT 454JV', 4, 1.25, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30096200', 'ML CHKN THIGHS VP', 7, 0.97, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712345', 'YFM ATL SLMN W/BUTR', 14, 3.43, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30096145', 'ML CHKN DRUMS VP', 14, 2.3, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31237716', 'YFM SLMN COHO FILLET', 14, 0.9, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('9314778', 'ML CKN BRST BNLSKNLS', 17, 4.49, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30231908', 'BFGRD LEAN 454YF', 14, 2.24, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712348', 'YFM LMN HRB COHO', 20, 3.45, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30232055', 'BFGRD XLEAN 454YF', 17, 1.65, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30700923', 'BFGRD LEAN TB1YF', 9, 3.91, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31034407', 'PKGRD LEAN 454ML', 13, 0.64, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31237984', 'YFM TILAPIA FILLET', 12, 2.77, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30798737', 'ML CKN BSB VP', 10, 2.68, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30062738', 'BFSTK SRLN TIP C11YF', 12, 0.52, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772503', 'AA TRI TIP', 6, 1.42, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31236718', 'YFM SLMN ATLANTIC PTN', 7, 2.29, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50191456', 'PKCHP COMBO C15ML', 12, 1.38, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30133763', 'YFM SLMN ATL PTN 2PC', 18, 3.98, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31237716', 'YFM SLMN COHO FILLET', 2, 4.66, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50600221', 'PK BELLY BL C09MR', 8, 1.2, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30010520', 'PKSSG BR ORIG 375ML', 2, 2.69, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30148828', 'MINA HALAL CHN THIGH', 15, 1.55, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30953524', 'AQMR SURIMI FLAKE340', 15, 0.84, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50158149', 'BF TRI TIP SIRLOIN', 16, 2.18, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30953525', 'AQMR SURIMI STICK340', 14, 3.5, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177843', 'PKGRD LEAN 454MR', 11, 2.39, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576425', 'PKSSG BR RND 250JV', 16, 2.82, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576422', 'PKSSG DN MLDIT 500JV', 11, 4.96, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50158149', 'BF TRI TIP SIRLOIN', 14, 2.91, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30489356', 'PRIME RWA BST', 8, 3.12, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31710966', 'GOAT CUBES BONE IN', 3, 4.35, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30512743', 'BFRST SRLN TIP C10YF', 10, 2.38, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30148672', 'MINA HALAL CHKN DRUM', 17, 0.96, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576424', 'PKSSG DN BRAT 500JV', 14, 0.92, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30053516', 'BFGRD LEAN C14YF', 4, 2.15, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30433243', 'MINA HALAL CHN BST', 6, 1.77, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31034407', 'PKGRD LEAN 454ML', 6, 4.57, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772503', 'AA TRI TIP', 6, 2.32, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31742690', 'BFSTK INSD RND C05YF', 16, 3.42, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30133763', 'YFM SLMN ATL PTN 2PC', 16, 0.77, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576373', 'JVL BWN SUG HON', 14, 1.29, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30426668', 'PK HALF LOIN', 4, 2.95, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177806', 'PKCHP FST FRY COBMR', 19, 4.58, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30053516', 'BFGRD LEAN C14YF', 11, 0.64, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31330154', 'PK TNDRLN C12FL', 14, 4.91, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30831503', 'BF MEATBALL', 10, 1.73, 1777565596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30231908', 'BFGRD LEAN 454YF', 5, 1.51, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30489356', 'PRIME RWA BST', 6, 0.7, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30700923', 'BFGRD LEAN TB1YF', 20, 0.63, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50617592', 'BFSTK INS ROUND HL', 20, 4.51, 1777911196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50194701', 'PKRIB SWEETNSR C18ML', 18, 4.87, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30831503', 'BF MEATBALL', 15, 1.49, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177839', 'PKCHP CTR RIB C14ML', 8, 3.91, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30512743', 'BFRST SRLN TIP C10YF', 12, 3.77, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576424', 'PKSSG DN BRAT 500JV', 4, 3.47, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50194696', 'PKRIB BACK C10ML', 16, 3.59, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50712345', 'YFM ATL SLMN W/BUTR', 16, 3.71, 1777479196295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31237250', 'YFM BASA FILLET', 14, 1.69, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50194701', 'PKRIB SWEETNSR C18ML', 20, 3.39, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772502', 'AA STRIPLOIN STEAK', 17, 0.86, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30953524', 'AQMR SURIMI FLAKE340', 10, 2.05, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50772503', 'AA TRI TIP', 14, 3.44, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31034407', 'PKGRD LEAN 454ML', 17, 1.8, 1777997596295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50617592', 'BFSTK INS ROUND HL', 9, 2.14, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50191456', 'PKCHP COMBO C15ML', 15, 1.41, 1777392796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50177806', 'PKCHP FST FRY COBMR', 13, 1.47, 1777651996295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('31330154', 'PK TNDRLN C12FL', 17, 2.67, 1777738396295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('50576425', 'PKSSG BR RND 250JV', 14, 2.87, 1777824796295, 1777565596295, 1777565596295);
INSERT INTO sales_floor (pid, name, count, weight, expiry_date, created_at, updated_at) VALUES ('30212214', 'MINA HALAL CHN GRNDS', 4, 2.9, 1777738396295, 1777565596295, 1777565596295);