# Dados De Contatos

Esta pasta guarda bases de contatos usadas em importações e testes operacionais.

- `umana/`: planilhas XLSX, CSVs exportados e prompt de referência do cliente Umana.
- Scripts de conversão ficam centralizados em `scripts/`, especialmente `scripts/xlsx-to-csv.js`.
- Para converter uma planilha:

```bash
npm run contacts:xlsx-to-csv -- data/contacts/umana/arquivo.xlsx --out data/contacts/umana/CSVs
```

Evite adicionar dados sensíveis novos sem confirmar se eles realmente precisam ser versionados.
