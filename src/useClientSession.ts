'use client';

import { useSession } from 'next-auth/react';
import { useEffect, useState } from 'react';

export function useClientSession() {
  const [isClient, setIsClient] = useState(false);
  const sessionData = useSession();

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Durante SSR (build), retorna un estado seguro
  if (!isClient) {
    return { 
      data: null, 
      status: 'loading',
      update: async () => {} 
    };
  }

  // En el cliente, retorna los datos reales de la sesión
  return sessionData;
}
