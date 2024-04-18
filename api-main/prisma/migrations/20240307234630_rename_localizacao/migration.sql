/*
  Warnings:

  - You are about to drop the column `Latitude` on the `LOCALIZACAO` table. All the data in the column will be lost.
  - You are about to drop the column `Longitude` on the `LOCALIZACAO` table. All the data in the column will be lost.
  - Added the required column `LATITUDE` to the `LOCALIZACAO` table without a default value. This is not possible if the table is not empty.
  - Added the required column `LONGITUDE` to the `LOCALIZACAO` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_LOCALIZACAO" (
    "ID" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "LATITUDE" REAL NOT NULL,
    "LONGITUDE" REAL NOT NULL,
    "ID_APARELHO" INTEGER NOT NULL,
    "DATAHORA" DATETIME NOT NULL,
    CONSTRAINT "LOCALIZACAO_ID_APARELHO_fkey" FOREIGN KEY ("ID_APARELHO") REFERENCES "APARELHO" ("ID") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_LOCALIZACAO" ("DATAHORA", "ID", "ID_APARELHO") SELECT "DATAHORA", "ID", "ID_APARELHO" FROM "LOCALIZACAO";
DROP TABLE "LOCALIZACAO";
ALTER TABLE "new_LOCALIZACAO" RENAME TO "LOCALIZACAO";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
