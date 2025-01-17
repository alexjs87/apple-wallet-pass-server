const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const fastify = require("fastify")({
  logger: true,
});
const { PKPass } = require("passkit-generator");

const certDirectory = path.resolve(process.cwd(), "cert");
const wwdr = fs.readFileSync(path.join(certDirectory, "wwdr.pem"));
const signerCert = fs.readFileSync(path.join(certDirectory, "signerCert.pem"));
const signerKey = fs.readFileSync(path.join(certDirectory, "signerKey.key"));

fastify.post("/", async (request, reply) => {
  const { name } = request.body;

  // Feel free to use any other kind of UID here or even read an
  // existing ticket from the database and use its ID
  const passID = crypto
    .createHash("md5")
    .update(`${name}_${Date.now()}`)
    .digest("hex");

  // Generate the pass
  const pass = await PKPass.from(
    {
      model: path.resolve(process.cwd(), "ticket.pass"),
      certificates: {
        wwdr,
        signerCert,
        signerKey,
      },
    },
    {
      eventTicket: {},
      serialNumber: passID,
    }
  );

  // Adding some settings to be written inside pass.json
  pass.setBarcodes(passID);
  if (Boolean(name)) {
    pass.secondaryFields.push({
      key: "name",
      label: "Name",
      value: name,
    });
  }

  reply.header("Content-Type", "application/vnd-apple.pkpass");

  reply.send(pass.getAsBuffer());
});

// Start the server
fastify.listen({ port: process.env.PORT ?? 3000 }, function (err) {
  if (err) {
    fastify.log.error(err);
    process.exit(1);
  }
});
