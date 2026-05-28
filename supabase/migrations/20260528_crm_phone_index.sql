-- Speed up the JOIN between crm_cards and clientes_whatsapp on phone
CREATE INDEX IF NOT EXISTS idx_crm_cards_phone ON crm_cards(phone);
CREATE INDEX IF NOT EXISTS idx_crm_cards_client_phone ON crm_cards(client_id, phone);
