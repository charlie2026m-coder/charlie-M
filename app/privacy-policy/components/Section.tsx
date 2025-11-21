import Dot from "@/app/_components/ui/dot";

export default function Section({ id, title, paragraphs }: { id: string, title: string, paragraphs: string[] }) {
  return (
    <div id={id} className="mb-8 scroll-mt-24">
      <div className="flex items-center gap-3 mb-5">
        <Dot size={20} color="blue" />
        <h2 className="text-3xl md:text-[40px] font-semibold inter">{title}</h2>
      </div>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className="text-sm inter text-dark mb-3">{paragraph}</p>
      ))}
    </div>
  )
}