/*
  Script unico para o desafio BNP/Antlia (.NET + SQL Server)
  Conteudo: Tabelas, chaves, dados iniciais (INSERTs) e stored procedure de consulta.
*/

SET NOCOUNT ON;
GO

/*
  Se desejar forcar uso do banco local do desafio, descomente:
  USE [MovimentosManuais];
  GO
*/

/* =========================================================
   DROP DE OBJETOS (ordem para evitar dependencia)
   ========================================================= */
IF OBJECT_ID('dbo.SP_CONSULTAR_MOVIMENTOS', 'P') IS NOT NULL
    DROP PROCEDURE dbo.SP_CONSULTAR_MOVIMENTOS;
GO

IF OBJECT_ID('dbo.MOVIMENTO_MANUAL', 'U') IS NOT NULL
    DROP TABLE dbo.MOVIMENTO_MANUAL;
GO

IF OBJECT_ID('dbo.PRODUTO_COSIF', 'U') IS NOT NULL
    DROP TABLE dbo.PRODUTO_COSIF;
GO

IF OBJECT_ID('dbo.PRODUTO', 'U') IS NOT NULL
    DROP TABLE dbo.PRODUTO;
GO

/* =========================================================
   TABELA: PRODUTO
   ========================================================= */
CREATE TABLE dbo.PRODUTO
(
    COD_PRODUTO CHAR(4)      NOT NULL,
    DES_PRODUTO VARCHAR(30)  NULL,
    STA_STATUS  CHAR(1)      NULL,

    CONSTRAINT PK_PRODUTO PRIMARY KEY (COD_PRODUTO),
    CONSTRAINT CK_PRODUTO_STA_STATUS CHECK (STA_STATUS IN ('A', 'I') OR STA_STATUS IS NULL)
);
GO

/* =========================================================
   TABELA: PRODUTO_COSIF
   ========================================================= */
CREATE TABLE dbo.PRODUTO_COSIF
(
    COD_PRODUTO       CHAR(4)      NOT NULL,
    COD_COSIF         VARCHAR(11)  NOT NULL,
    COD_CLASSIFICACAO CHAR(6)      NULL,
    STA_STATUS        CHAR(1)      NULL,

    CONSTRAINT PK_PRODUTO_COSIF PRIMARY KEY (COD_PRODUTO, COD_COSIF),
    CONSTRAINT FK_PRODUTO_COSIF_PRODUTO
        FOREIGN KEY (COD_PRODUTO) REFERENCES dbo.PRODUTO (COD_PRODUTO),
    CONSTRAINT CK_PRODUTO_COSIF_STA_STATUS CHECK (STA_STATUS IN ('A', 'I') OR STA_STATUS IS NULL)
);
GO

/* =========================================================
   TABELA: MOVIMENTO_MANUAL
   ========================================================= */
CREATE TABLE dbo.MOVIMENTO_MANUAL
(
    DAT_MES        NUMERIC(2, 0)   NOT NULL,
    DAT_ANO        NUMERIC(4, 0)   NOT NULL,
    NUM_LANCAMENTO NUMERIC(18, 0)  NOT NULL,
    COD_PRODUTO    CHAR(4)         NOT NULL,
    COD_COSIF      VARCHAR(11)     NOT NULL,
    VAL_VALOR      NUMERIC(18, 2)  NOT NULL,
    DES_DESCRICAO  VARCHAR(50)     NOT NULL,
    DAT_MOVIMENTO  SMALLDATETIME   NOT NULL,
    COD_USUARIO    VARCHAR(15)     NOT NULL,

    CONSTRAINT PK_MOVIMENTO_MANUAL
        PRIMARY KEY (DAT_MES, DAT_ANO, NUM_LANCAMENTO, COD_PRODUTO, COD_COSIF),
    CONSTRAINT FK_MOVIMENTO_MANUAL_PRODUTO_COSIF
        FOREIGN KEY (COD_PRODUTO, COD_COSIF)
        REFERENCES dbo.PRODUTO_COSIF (COD_PRODUTO, COD_COSIF),
    CONSTRAINT CK_MOVIMENTO_MANUAL_MES CHECK (DAT_MES BETWEEN 1 AND 12),
    CONSTRAINT CK_MOVIMENTO_MANUAL_ANO CHECK (DAT_ANO BETWEEN 1900 AND 2999),
    CONSTRAINT CK_MOVIMENTO_MANUAL_VALOR CHECK (VAL_VALOR >= 0)
);
GO

/* =========================================================
   DADOS INICIAIS (INSERTS)
   ========================================================= */
INSERT INTO dbo.PRODUTO (COD_PRODUTO, DES_PRODUTO, STA_STATUS)
VALUES
('0001', 'Produto Teste',   'A'),
('0002', 'Produto Teste 2', 'A'),
('0003', 'Produto Teste 3', 'I');
GO

INSERT INTO dbo.PRODUTO_COSIF (COD_PRODUTO, COD_COSIF, COD_CLASSIFICACAO, STA_STATUS)
VALUES
('0001', '12345678901', 'NORMAL', 'A'),
('0001', '12345678902', 'MTM001', 'A'),
('0002', '22345678901', 'NORMAL', 'A'),
('0002', '22345678902', 'MTM001', 'A'),
('0003', '32345678901', 'NORMAL', 'I');
GO

INSERT INTO dbo.MOVIMENTO_MANUAL
(
    DAT_MES,
    DAT_ANO,
    NUM_LANCAMENTO,
    COD_PRODUTO,
    COD_COSIF,
    VAL_VALOR,
    DES_DESCRICAO,
    DAT_MOVIMENTO,
    COD_USUARIO
)
VALUES
(5,  2012, 1, '0001', '12345678901', 500.00, 'Teste Movimentos',   GETDATE(), 'candidato'),
(5,  2012, 2, '0002', '22345678901',  10.00, 'Teste Movimentos 2', GETDATE(), 'candidato'),
(5,  2012, 3, '0001', '12345678902',  12.00, 'Teste Movimentos 2', GETDATE(), 'candidato'),
(6,  2012, 1, '0001', '12345678901', 100.00, 'Teste Movimentos 4', GETDATE(), 'candidato');
GO

/* =========================================================
   STORED PROCEDURE (item 2 / usada na grid do item 3.2)
   ========================================================= */
CREATE PROCEDURE dbo.SP_CONSULTAR_MOVIMENTOS
    @DAT_MES NUMERIC(2, 0) = NULL,
    @DAT_ANO NUMERIC(4, 0) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    SELECT
        M.DAT_MES        AS MES,
        M.DAT_ANO        AS ANO,
        M.COD_PRODUTO    AS CODIGO_PRODUTO,
        P.DES_PRODUTO    AS DESCRICAO_PRODUTO,
        M.NUM_LANCAMENTO AS NUMERO_LANCAMENTO,
        M.DES_DESCRICAO  AS DESCRICAO,
        M.VAL_VALOR      AS VALOR
    FROM dbo.MOVIMENTO_MANUAL M
    INNER JOIN dbo.PRODUTO P
        ON P.COD_PRODUTO = M.COD_PRODUTO
    WHERE (@DAT_MES IS NULL OR M.DAT_MES = @DAT_MES)
      AND (@DAT_ANO IS NULL OR M.DAT_ANO = @DAT_ANO)
    ORDER BY
        M.DAT_MES,
        M.DAT_ANO,
        M.NUM_LANCAMENTO;
END;
GO

/* =========================================================
   TESTE RAPIDO
   ========================================================= */
EXEC dbo.SP_CONSULTAR_MOVIMENTOS;
GO
