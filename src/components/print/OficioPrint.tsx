import React from 'react';
import { Oficio } from '../../types/oficio';
import papelTimbrado from '@/logos/papel-timbrado.png';

 

interface OficioPrintProps {
  oficio: Oficio | null;
}

const OficioPrint: React.FC<OficioPrintProps> = ({ oficio }) => {
  if (!oficio) return null;

  // Função auxiliar para formatar a data por extenso (Ex: "8 de abril de 2026")
  const formatarDataExtenso = (dataStr: string) => {
    if (!dataStr) return '';
    const data = new Date(dataStr + 'T12:00:00'); // Evita timezone offset
    const dia = data.getDate();
    const meses = [
      'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
      'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'
    ];
    const mes = meses[data.getMonth()];
    const ano = data.getFullYear();
    return `${dia} de ${mes} de ${ano}`;
  };

  return (
    <div id="printable-oficio" className="hidden print:block bg-white text-black font-serif max-w-[21cm] mx-auto min-h-[29.7cm] print:min-h-0 print:m-0 print:p-0 overflow-hidden box-border">
      {/* Imagem de Fundo (Papel Timbrado) */}
      <img
        src={papelTimbrado}
        alt="Papel Timbrado"
        className="print-bg"
      />

      {/* Tabela de layout de impressão para controle de cabeçalho, rodapé e quebras de página */}
      <table className="print-layout-table">
        <thead className="print-table-header">
          <tr>
            <td>
              <div className="print-header-spacer"></div>
            </td>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td>
              {/* Conteúdo do Ofício */}
              <div className="relative z-10 oficio-content-container">
                {/* Número do Ofício */}
                <div className="mb-6 font-bold text-lg uppercase">
                  {oficio.numero}
                </div>

                {/* Local e Data */}
                <div className="text-right mb-6">
                  Araguari, {formatarDataExtenso(oficio.data_emissao)}.
                </div>

                {/* Destinatário */}
                <div className="mb-10 leading-snug">
                  <p>{oficio.destinatario_tratamento}</p>
                  <p className="font-bold">{oficio.destinatario_nome}</p>
                  <p>{oficio.destinatario_cargo}</p>
                </div>

                {/* Assunto */}
                <div className="mb-10 font-bold">
                  Assunto: {oficio.assunto}
                </div>

                {/* Corpo do Ofício */}
                <div 
                  className="mb-8 text-justify leading-relaxed quill-print-content whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: (oficio.conteudo || '').replace(/&nbsp;/g, ' ') }}
                />

                {/* Fechamento */}
                <div className="mb-10 text-center sm:text-left ml-0 sm:ml-[10%]">
                  Atenciosamente,
                </div>

                {/* Assinatura */}
                <div className="flex flex-col items-center text-center mt-12">
                  <div className="w-64 border-t border-black mb-2"></div>
                  <p className="font-bold uppercase">{oficio.assinatura_nome}</p>
                  <p>{oficio.assinatura_cargo}</p>
                </div>
              </div>
            </td>
          </tr>
        </tbody>
        <tfoot className="print-table-footer">
          <tr>
            <td>
              <div className="print-footer-spacer"></div>
            </td>
          </tr>
        </tfoot>
      </table>

      <style>{`
        /* Estilos na tela (Preview) */
        #printable-oficio {
          position: relative !important;
          width: 21cm !important;
          min-height: 29.7cm !important;
          box-sizing: border-box !important;
          padding: 5.2cm 2.5cm 6.5cm 2.5cm !important;
          background-color: white !important;
          overflow: hidden !important;
          isolation: isolate !important;
        }

        .print-bg {
          position: absolute !important;
          top: 0 !important;
          left: 0 !important;
          width: 100% !important;
          max-width: none !important;
          height: 100% !important;
          object-fit: fill !important;
          z-index: -1 !important;
          pointer-events: none !important;
        }

        .print-layout-table {
          width: 100% !important;
          border-collapse: collapse !important;
          border: none !important;
        }

        .print-layout-table td {
          padding: 0 !important;
          border: none !important;
        }

        .print-table-header, .print-table-footer {
          display: none !important;
        }

        .oficio-content-container {
          padding: 0 !important;
        }

        @media print {
          /* Zeramos as margens físicas da folha no @page para evitar duplicação
             de recuos e deixar a tabela HTML governar as margens das páginas */
          @page {
            size: A4;
            margin: 0 !important;
          }
          
          html {
            background-image: url("${papelTimbrado}") !important;
            background-size: 210mm 297mm !important;
            background-repeat: repeat-y !important;
            background-position: top left !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
            background-color: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          
          body {
            background-color: transparent !important;
            background: transparent !important;
            margin: 0 !important;
            padding: 0 !important;
          }

          /* Oculta a tag <img> de tela na impressão */
          .print-bg {
            display: none !important;
          }

          /* Remove os estilos do simulador A4 da tela na impressão */
          #printable-oficio {
            display: block !important;
            position: static !important;
            width: auto !important;
            height: auto !important;
            min-height: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            overflow: visible !important;
            box-sizing: border-box !important;
          }

          /* Remove sombras e cores de fundo dos contêineres pais */
          .bg-slate-100, .bg-white, .shadow-xl {
            background-color: transparent !important;
            background: transparent !important;
            box-shadow: none !important;
            padding: 0 !important;
          }

          /* Ativa e exibe a tabela de impressão */
          .print-layout-table {
            width: 100% !important;
            border-collapse: collapse !important;
            border: none !important;
          }

          .print-layout-table td {
            border: none !important;
            padding: 0 !important;
          }

          /* Ativa os espaçadores repetidos por página na impressão */
          .print-table-header {
            display: table-header-group !important;
          }

          .print-table-footer {
            display: table-footer-group !important;
          }

          /* Altura exata do cabeçalho timbrado na impressão física */
          .print-header-spacer {
            height: 4.2cm !important;
            display: block !important;
          }

          /* Altura do rodapé timbrado para que o texto quebre antes da logo do rodapé */
          .print-footer-spacer {
            height: 6.5cm !important;
            display: block !important;
          }

          /* Margens laterais do conteúdo de texto aplicadas na célula de impressão */
          .oficio-content-container {
            padding: 0 2.5cm !important;
            box-sizing: border-box !important;
            display: block !important;
          }

          /* Ajustes de estilo pro texto rico do Quill na impressão */
          .quill-print-content p { margin-bottom: 1em; }
          .quill-print-content strong { font-weight: bold; }
          .quill-print-content em { font-style: italic; }
          .quill-print-content u { text-decoration: underline; }
          .quill-print-content ol { list-style-type: decimal; padding-left: 2em; margin-bottom: 1em; }
          .quill-print-content ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1em; }
          
          /* Alinhamentos do Quill */
          .quill-print-content .ql-align-center { text-align: center !important; }
          .quill-print-content .ql-align-right { text-align: right !important; }
          .quill-print-content .ql-align-justify { text-align: justify !important; }
          
          /* Indentações do Quill */
          .quill-print-content .ql-indent-1 { padding-left: 3em !important; }
          .quill-print-content .ql-indent-2 { padding-left: 6em !important; }
          .quill-print-content .ql-indent-3 { padding-left: 9em !important; }
          .quill-print-content .ql-indent-4 { padding-left: 12em !important; }
          .quill-print-content .ql-indent-5 { padding-left: 15em !important; }
          .quill-print-content .ql-indent-6 { padding-left: 18em !important; }
          .quill-print-content .ql-indent-7 { padding-left: 21em !important; }
          .quill-print-content .ql-indent-8 { padding-left: 24em !important; }
          
          /* Tamanhos de Fonte do Quill */
          .quill-print-content .ql-size-small { font-size: 0.75em !important; }
          .quill-print-content .ql-size-large { font-size: 1.5em !important; }
          .quill-print-content .ql-size-huge { font-size: 2.5em !important; }
        }
        
        /* Adicionar as regras também fora do @media print para funcionar na aba nova (view normal) */
        .quill-print-content p { margin-bottom: 1em; }
        .quill-print-content strong { font-weight: bold; }
        .quill-print-content em { font-style: italic; }
        .quill-print-content u { text-decoration: underline; }
        .quill-print-content ol { list-style-type: decimal; padding-left: 2em; margin-bottom: 1em; }
        .quill-print-content ul { list-style-type: disc; padding-left: 2em; margin-bottom: 1em; }
        .quill-print-content .ql-align-center { text-align: center !important; }
        .quill-print-content .ql-align-right { text-align: right !important; }
        .quill-print-content .ql-align-justify { text-align: justify !important; }

        .quill-print-content .ql-indent-1 { padding-left: 3em !important; }
        .quill-print-content .ql-indent-2 { padding-left: 6em !important; }
        .quill-print-content .ql-indent-3 { padding-left: 9em !important; }
        .quill-print-content .ql-indent-4 { padding-left: 12em !important; }
        .quill-print-content .ql-indent-5 { padding-left: 15em !important; }
        .quill-print-content .ql-indent-6 { padding-left: 18em !important; }
        .quill-print-content .ql-indent-7 { padding-left: 21em !important; }
        .quill-print-content .ql-indent-8 { padding-left: 24em !important; }
        
        .quill-print-content .ql-size-small { font-size: 0.75em !important; }
        .quill-print-content .ql-size-large { font-size: 1.5em !important; }
        .quill-print-content .ql-size-huge { font-size: 2.5em !important; }
      `}</style>
    </div>
  );
};

export default OficioPrint;
