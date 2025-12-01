-- Migration: Add wamid column to n8n_chat_histories for WhatsApp message reactions
-- This stores the WhatsApp message ID (wamid.xxx) for each message
-- Required for sending reactions via WhatsApp API

DO $$ 
BEGIN
  -- Check if table exists
  IF EXISTS (SELECT FROM pg_tables WHERE tablename = 'n8n_chat_histories') THEN
    -- Check if column doesn't already exist
    IF NOT EXISTS (
      SELECT FROM information_schema.columns 
      WHERE table_name = 'n8n_chat_histories' 
      AND column_name = 'wamid'
    ) THEN
      -- Add wamid column
      ALTER TABLE n8n_chat_histories 
      ADD COLUMN wamid VARCHAR(255);
      
      -- Create index for faster lookups by wamid
      CREATE INDEX IF NOT EXISTS idx_n8n_chat_histories_wamid 
      ON n8n_chat_histories(wamid);
      
      RAISE NOTICE '✅ Column wamid added to n8n_chat_histories';
    ELSE
      RAISE NOTICE 'ℹ️  Column wamid already exists in n8n_chat_histories';
    END IF;
  ELSE
    RAISE WARNING '⚠️  Table n8n_chat_histories not found';
  END IF;
END $$;

-- Add comment explaining the column
COMMENT ON COLUMN n8n_chat_histories.wamid IS 'WhatsApp message ID (wamid.xxx) for sending reactions via Meta API';
