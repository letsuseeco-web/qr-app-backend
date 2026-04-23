exports.generateUserCode = async (client) => {
  const result = await client.query(
    "SELECT nextval('user_code_seq') as num"
  );

  const num = result.rows[0].num;

  return "USR_" + String(num).padStart(3, "0");
};