CREATE POLICY clients_insert
  ON public.clients
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.is_firm_member(firm_id)
    AND public.has_permission('clients.create', firm_id, 'Firm')
  );

CREATE POLICY users_update_self
  ON public.users
  FOR UPDATE
  TO authenticated
  USING (auth_user_id = auth.uid())
  WITH CHECK (auth_user_id = auth.uid());

CREATE POLICY firms_update_authorized
  ON public.firms
  FOR UPDATE
  TO authenticated
  USING (public.has_permission('profile.update_firm', id, 'Firm'))
  WITH CHECK (public.has_permission('profile.update_firm', id, 'Firm'));
