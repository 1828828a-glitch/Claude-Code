declare module "*.woff2" {
  /** webpack の asset/inline により、data: URI 文字列として読み込まれる。 */
  const url: string;
  export default url;
}
