// sanitize-htmlの型が壊れているので正しい型を付与する
import * as untypedSanitize from 'sanitize-html';

const sanitizeHtml = untypedSanitize as unknown as Pick<typeof untypedSanitize, keyof typeof untypedSanitize> & {
  default: typeof untypedSanitize;
};

export default sanitizeHtml;
