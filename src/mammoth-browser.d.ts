// mammoth ships types only for its main entry; the browser standalone build
// (which we must use — the main entry breaks under Vite, vite#8646) needs
// this ambient declaration.
declare module 'mammoth/mammoth.browser' {
  import mammoth from 'mammoth';
  export default mammoth;
}
