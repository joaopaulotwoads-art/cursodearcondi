<?xml version="1.0" encoding="UTF-8"?>
<!--
  sitemap.xsl — Folha de estilo para visualização do sitemap no navegador.
  Melhora contraste e legibilidade (texto escuro sobre fundo claro).
-->
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform" xmlns:sitemap="http://www.sitemaps.org/schemas/sitemap/0.9">
  <xsl:output method="html" encoding="UTF-8" indent="yes" doctype-public="-//W3C//DTD XHTML 1.0 Strict//EN" doctype-system="http://www.w3.org/TR/xhtml1/DTD/xhtml1-strict.dtd"/>
  <xsl:template match="/">
    <html xmlns="http://www.w3.org/1999/xhtml">
      <head>
        <title>Sitemap</title>
        <meta name="viewport" content="width=device-width, initial-scale=1"/>
        <style>
          * { box-sizing: border-box; }
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;
            margin: 0;
            padding: 2rem;
            background: #f8fafc;
            color: #1e293b;
            line-height: 1.6;
            max-width: 900px;
            margin-left: auto;
            margin-right: auto;
          }
          h1 {
            font-size: 1.5rem;
            margin-bottom: 0.5rem;
            color: #0f172a;
          }
          .subtitle { color: #64748b; font-size: 0.875rem; margin-bottom: 1.5rem; }
          table {
            width: 100%;
            border-collapse: collapse;
            background: #fff;
            border-radius: 8px;
            overflow: hidden;
            box-shadow: 0 1px 3px rgba(0,0,0,0.08);
          }
          th, td {
            padding: 0.75rem 1rem;
            text-align: left;
            border-bottom: 1px solid #e2e8f0;
          }
          th {
            background: #1e293b;
            color: #f8fafc;
            font-weight: 600;
            font-size: 0.8rem;
          }
          tr:hover td { background: #f1f5f9; }
          a {
            color: #2563eb;
            text-decoration: none;
            word-break: break-all;
          }
          a:hover { text-decoration: underline; }
          .lastmod { color: #64748b; font-size: 0.875rem; }
          .count { color: #64748b; font-size: 0.875rem; margin-bottom: 1rem; }
        </style>
      </head>
      <body>
        <h1>Sitemap</h1>
        <p class="subtitle">Mapa do site para indexação em buscadores</p>
        <p class="count">
          <xsl:text>Total: </xsl:text>
          <xsl:value-of select="count(sitemap:urlset/sitemap:url)"/>
          <xsl:text> URLs</xsl:text>
        </p>
        <table>
          <thead>
            <tr>
              <th>#</th>
              <th>URL</th>
              <th>Última alteração</th>
            </tr>
          </thead>
          <tbody>
            <xsl:for-each select="sitemap:urlset/sitemap:url">
              <tr>
                <td><xsl:value-of select="position()"/></td>
                <td>
                  <a href="{sitemap:loc}">
                    <xsl:value-of select="sitemap:loc"/>
                  </a>
                </td>
                <td class="lastmod">
                  <xsl:value-of select="sitemap:lastmod"/>
                </td>
              </tr>
            </xsl:for-each>
          </tbody>
        </table>
      </body>
    </html>
  </xsl:template>
</xsl:stylesheet>
