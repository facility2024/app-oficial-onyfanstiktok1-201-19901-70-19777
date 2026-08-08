-- Vincular todos os produtos existentes à loja Coconudi Brasil
UPDATE marketplace_products 
SET store_id = '4af1ce85-758a-4389-8c26-8c3cc9827f39' 
WHERE store_id IS NULL;
