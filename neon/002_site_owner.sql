-- A conta proprietária do projeto Sites usa este e-mail para o login hospedado.
INSERT INTO admin_memberships (email, role)
VALUES ('gbmend@gmail.com', 'owner')
ON CONFLICT (email) DO NOTHING;
