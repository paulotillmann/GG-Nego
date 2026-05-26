import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Oficio } from '../types/oficio';
import OficioPrint from '../components/print/OficioPrint';

interface OficioPrintStandaloneProps {
  id: string;
}

const OficioPrintStandalone: React.FC<OficioPrintStandaloneProps> = ({ id }) => {
  const [oficio, setOficio] = useState<Oficio | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchOficio = async () => {
      const { data, error } = await supabase
        .from('oficios')
        .select('*')
        .eq('id', id)
        .single();
      
      if (!error && data) {
        setOficio(data as Oficio);
      }
      setLoading(false);
    };

    fetchOficio();
  }, [id]);

  if (loading) {
    return <div className="p-10 text-center font-sans text-slate-500">Carregando ofício...</div>;
  }

  if (!oficio) {
    return <div className="p-10 text-center font-sans text-red-500">Ofício não encontrado.</div>;
  }

  return (
    <div className="bg-slate-100 min-h-screen py-8 print-container">
      <div className="max-w-[21cm] mx-auto bg-white shadow-xl card-container">
        <OficioPrint oficio={oficio} />
      </div>
      <style>{`
        /* Remove a regra que esconde a div de impressão, já que esta tela é exclusiva para ela */
        #printable-oficio {
          display: block !important;
          position: relative !important;
        }

        @media print {
          body, html {
            background-color: transparent !important;
          }
          #printable-oficio {
            position: static !important;
          }
          .bg-slate-100, .print-container {
            background-color: transparent !important;
            background: transparent !important;
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
            max-width: none !important;
            min-height: 0 !important;
            height: auto !important;
          }
          .shadow-xl {
            box-shadow: none !important;
            background-color: transparent !important;
            background: transparent !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          .bg-white {
            background-color: transparent !important;
            background: transparent !important;
            width: 100% !important;
            max-width: none !important;
            margin: 0 !important;
            padding: 0 !important;
          }
        }
      `}</style>
    </div>
  );
};

export default OficioPrintStandalone;
