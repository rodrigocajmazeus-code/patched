export default function Brand() {
  return <span className="patched-brand"><img src={`${import.meta.env.BASE_URL}patched-mark.svg`} alt="" aria-hidden="true" /><span>PATCHED</span></span>
}
