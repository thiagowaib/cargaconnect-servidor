-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_MENSAGENS" (
    "ID" TEXT NOT NULL PRIMARY KEY,
    "CONTEUDO" TEXT NOT NULL,
    "DATAHORA" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "DATAHORAENVIO" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_MENSAGENS" ("CONTEUDO", "DATAHORA", "ID") SELECT "CONTEUDO", "DATAHORA", "ID" FROM "MENSAGENS";
DROP TABLE "MENSAGENS";
ALTER TABLE "new_MENSAGENS" RENAME TO "MENSAGENS";
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
