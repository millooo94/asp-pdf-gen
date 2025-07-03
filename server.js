const express = require("express");
const fs = require("fs");
const { PDFDocument } = require("pdf-lib");
const path = require("path");
const archiver = require("archiver");

const app = express();
app.use(express.static("public"));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Funzione per impostare testo nei campi del modulo PDF in modo sicuro
function trySetText(form, fieldName, text) {
  try {
    const field = form.getTextField(fieldName);
    if (field && text !== undefined && text !== null) {
      field.setText(text.toString());
    }
  } catch (e) {
    // Campo non trovato o errore ignorato
    console.warn(
      `Campo "${fieldName}" non trovato o errore nel setText:`,
      e.message
    );
  }
}

// Funzione per formattare data in formato italiano gg/mm/aaaa
function formattaDataIt({ giorno, mese, anno }) {
  if (!giorno || !mese || !anno) return "";
  const gg = giorno.toString().padStart(2, "0");
  const mm = mese.toString().padStart(2, "0");
  const aaaa = anno.toString();
  return `${gg}/${mm}/${aaaa}`;
}

app.post("/fill", async (req, res) => {
  const data = req.body;
  const template = data.template;
  const templatesInfo = [
    {
      nome: "contratto-professionale",
      fileBase: "contratto-professionale",
      cartella: "contratti-professionali",
    },
    {
      nome: "atto-notorio-godimento-diritti-civili",
      fileBase: "atto-notorio-godimento-diritti-civili",
      cartella: "godimento-diritti-civili",
    },
    {
      nome: "atto-notorio-impegno-orario",
      fileBase: "atto-notorio-impegno-orario",
      cartella: "impegno-orario",
    },
    {
      nome: "atto-notorio-incompatibilita",
      fileBase: "atto-notorio-incompatibilita",
      cartella: "incompatibilità",
    },
    {
      nome: "atto-notorio-titoli-di-studio",
      fileBase: "atto-notorio-titoli-di-studio",
      cartella: "titoli-di-studio",
    },
  ];

  try {
    // Verifica esistenza e validità template
    for (const tpl of templatesInfo) {
      let suffix = template;

      if (tpl.nome === "contratto-professionale") {
        if (!["uomo", "donna", "direttore-sanitario"].includes(template)) {
          throw new Error(
            "Categoria template non valida per contratto-professionale"
          );
        }
        suffix = template;
      } else {
        if (template === "direttore-sanitario") {
          suffix = "uomo";
        } else if (["uomo", "donna"].includes(template)) {
          suffix = template;
        } else {
          throw new Error(`Categoria template non valida per ${tpl.nome}`);
        }
      }

      const templateFile = path.join(
        __dirname,
        "templates",
        tpl.cartella,
        `${tpl.fileBase}-${suffix}.pdf`
      );

      if (!fs.existsSync(templateFile)) {
        throw new Error(`Template mancante: ${templateFile}`);
      }
    }

    // Preparazione risposta ZIP
    const zipFileName = "moduli_compilati.zip";
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", `attachment; filename=${zipFileName}`);

    const archive = archiver("zip");
    archive.pipe(res);

    // Generazione PDF per ogni template e aggiunta allo ZIP
    for (const tpl of templatesInfo) {
      let suffix = template;
      if (
        tpl.nome !== "contratto-professionale" &&
        template === "direttore-sanitario"
      ) {
        suffix = "uomo";
      }

      const templateFile = path.join(
        __dirname,
        "templates",
        tpl.cartella,
        `${tpl.fileBase}-${suffix}.pdf`
      );

      const pdfBytes = fs.readFileSync(templateFile);
      const pdfDoc = await PDFDocument.load(pdfBytes);
      const form = pdfDoc.getForm();

      // Compilazione campi modulo PDF
      trySetText(form, "nome_completo1", data.nome_completo);
      trySetText(form, "luogo_nascita", data.luogo_nascita);
      trySetText(
        form,
        "data_nascita",
        formattaDataIt({
          giorno: data.giorno_data_nascita,
          mese: data.mese_data_nascita,
          anno: data.anno_data_nascita,
        })
      );
      trySetText(form, "codice_fiscale", data.codice_fiscale);
      trySetText(form, "luogo_residenza", data.luogo_residenza);

      console.log("indirizzo_residenza:", data.indirizzo_residenza);

      trySetText(
        form,
        "indirizzo_residenza_senza_numero_civico",
        data.indirizzo_residenza
      );

      const indirizzoCompleto = [
        data.indirizzo_residenza,
        data.indirizzo_residenza_numero_civico,
      ]
        .filter(Boolean)
        .join(", ");

      trySetText(form, "indirizzo_residenza", indirizzoCompleto);

      trySetText(form, "universita_laurea", data.universita_laurea);
      trySetText(
        form,
        "data_laurea",
        formattaDataIt({
          giorno: data.giorno_data_laurea,
          mese: data.mese_data_laurea,
          anno: data.anno_data_laurea,
        })
      );
      trySetText(form, "provincia_ordine_medici", data.provincia_ordine_medici);
      trySetText(
        form,
        "data_iscrizione_ordine_medici",
        formattaDataIt({
          giorno: data.giorno_iscrizione_ordine_medici,
          mese: data.mese_iscrizione_ordine_medici,
          anno: data.anno_iscrizione_ordine_medici,
        })
      );
      trySetText(form, "numero_ordine_medici", data.numero_ordine_medici);
      trySetText(form, "specializzazione", data.specializzazione);
      trySetText(
        form,
        "universita_specializzazione",
        data.universita_specializzazione
      );
      trySetText(
        form,
        "data_specializzazione",
        formattaDataIt({
          giorno: data.giorno_specializzazione,
          mese: data.mese_specializzazione,
          anno: data.anno_specializzazione,
        })
      );

      trySetText(form, "nome_completo2", data.nome_completo);
      trySetText(form, "nome_completo3", data.nome_completo);
      trySetText(form, "nome_completo4", data.nome_completo);
      trySetText(form, "nome_completo5", data.nome_completo);
      trySetText(form, "specializzazione2", data.specializzazione);
      trySetText(form, "ore_settimanali", data.ore_settimanali);
      trySetText(form, "ore_settimanali_esteso", data.ore_settimanali_esteso);
      trySetText(form, "nome_completo6", data.nome_completo);
      trySetText(form, "nome_completo7", data.nome_completo);

      trySetText(
        form,
        "giorno_decorrenza_incarico",
        data.giorno_decorrenza_incarico?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "mese_decorrenza_incarico",
        data.mese_decorrenza_incarico?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "anno_decorrenza_incarico",
        data.anno_decorrenza_incarico
      );
      trySetText(
        form,
        "giorno_fine_incarico",
        data.giorno_fine_incarico?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "mese_fine_incarico",
        data.mese_fine_incarico?.toString().padStart(2, "0")
      );
      trySetText(form, "anno_fine_incarico", data.anno_fine_incarico);

      trySetText(form, "nome_completo8", data.nome_completo);
      trySetText(form, "nome_completo9", data.nome_completo);

      trySetText(
        form,
        "luogo_nascita_sigla_provincia",
        data.luogo_nascita_sigla_provincia
      );
      trySetText(
        form,
        "giorno_data_nascita",
        data.giorno_data_nascita?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "mese_data_nascita",
        data.mese_data_nascita?.toString().padStart(2, "0")
      );
      trySetText(form, "anno_data_nascita", data.anno_data_nascita);
      trySetText(
        form,
        "luogo_residenza_sigla_provincia",
        data.luogo_residenza_sigla_provincia
      );
      trySetText(
        form,
        "indirizzo_residenza_numero_civico",
        data.indirizzo_residenza_numero_civico
      );

      console.log("RUOLO ====>", data.ruolo);
      trySetText(form, "ruolo", data.ruolo);
      trySetText(form, "ruolo2", data.ruolo);
      trySetText(form, "tipo_rapporto", data.tipo_rapporto);
      trySetText(form, "orario_settimanale", data.orario_settimanale);
      trySetText(
        form,
        "giorno_data_laurea",
        data.giorno_data_laurea?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "mese_data_laurea",
        data.mese_data_laurea?.toString().padStart(2, "0")
      );
      trySetText(form, "anno_data_laurea", data.anno_data_laurea);
      trySetText(
        form,
        "giorno_iscrizione_ordine_medici",
        data.giorno_iscrizione_ordine_medici?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "mese_iscrizione_ordine_medici",
        data.mese_iscrizione_ordine_medici?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "anno_iscrizione_ordine_medici",
        data.anno_iscrizione_ordine_medici
      );
      trySetText(form, "giorno_specializzazione", data.giorno_specializzazione);
      trySetText(
        form,
        "mese_specializzazione",
        data.mese_specializzazione?.toString().padStart(2, "0")
      );
      trySetText(
        form,
        "anno_specializzazione",
        data.anno_specializzazione?.toString().padStart(2, "0")
      );

      form.flatten();

      const outputPdfBytes = await pdfDoc.save();

      archive.append(Buffer.from(outputPdfBytes), { name: `${tpl.nome}.pdf` });
    }

    await archive.finalize();
  } catch (error) {
    console.error("Errore durante la generazione dei PDF:", error);
    res.status(400).send(`Errore: ${error.message}`);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server avviato sulla porta ${PORT}`);
});
