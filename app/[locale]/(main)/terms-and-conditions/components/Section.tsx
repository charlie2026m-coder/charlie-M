
// Titles carry their own "1."–"23." numbering from the legal source text, so
// no index prefix is rendered here (it used to produce "0. …" numbering).
export default function Section({ id, title, paragraphs }: { id: string, title: string, paragraphs: string[] }) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <h2 className="text-xl md:text-3xl font-semibold text-mute inter">{title}</h2>
      </div>
      {paragraphs.map((paragraph, index) => (
        <p 
          key={index} 
          className="text-sm inter text-dark whitespace-pre-line mb-2"
          dangerouslySetInnerHTML={{ __html: paragraph }}
        />
      ))}
    </div>
  )
}