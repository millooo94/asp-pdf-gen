const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const path = require("path");

(async () => {
  const existingPdfBytes = fs.readFileSync(
    path.join(
      __dirname,
      "templates",
      "titoli-di-studio",
      `atto-notorio-titoli-di-studio-donna.pdf`
    )
  );
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();
  const fields = form.getFields();

  console.log("Campi nel modulo PDF:");
  fields.forEach((field) => {
    console.log(
      `- Nome campo: "${field.getName()}" - Tipo: ${field.constructor.name}`
    );
  });
})();
