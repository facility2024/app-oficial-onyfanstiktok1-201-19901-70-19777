CREATE POLICY "Creators view their sales"
ON public.payment_transactions
FOR SELECT TO authenticated
USING (private_model_id = auth.uid());