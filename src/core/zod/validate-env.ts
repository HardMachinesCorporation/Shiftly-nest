import { z } from 'zod';
import * as dotenv from 'dotenv';
import { inspect } from 'util';
import { EnvVariables, GlobalSchema } from './env-schemas';
import * as process from 'node:process';

dotenv.config({ encoding: 'utf8' });

// 🛠️ Formateur d’erreurs personnalisées
const customErrorMap: z.ZodErrorMap = (issue, ctx) => {
  if (issue.code === z.ZodIssueCode.invalid_type) {
    if (issue.received === 'undefined') {
      return { message: `La variable ${issue.path[0]} est obligatoire` };
    }
    return { message: `Doit être de type ${issue.expected}` };
  }
  return { message: ctx.defaultError };
};

z.setErrorMap(customErrorMap);

// ✅ Fonction de validation
export function validateEnv(config: Record<string, unknown>): EnvVariables {
  const processedConfig = {
    ...config,
    APP_PORT: Number(config.APP_PORT),
  };

  const result = GlobalSchema.safeParse(processedConfig);

  if (!result.success) {
    const errorDetails = result.error.errors.map((e) => {
      const detail: Record<string, unknown> = {
        path: e.path.join('.'),
        message: e.message,
      };

      if (e.code === 'invalid_type') {
        detail.received = e.received;
      }
      return detail;
    });

    console.error('❌ Erreur de configuration environnement :');
    console.error(inspect(errorDetails, { colors: true, depth: null }));
    console.error(
      '\n🛠️  Vérifie les variables requises définies dans le schéma :'
    );
    console.error(GlobalSchema.description || '(aucune description fournie)');
    process.exit(1);
  }
  if (result.data.NODE_ENV !== 'production') {
    console.log('✅ Configuration environnement validée :');
    console.log(
      inspect(result.data, { colors: true, depth: null, compact: true })
    );
  }
  return result.data;
}
