import { pgTable, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { createId } from '@paralleldrive/cuid2';

export const formData = pgTable('form_data', {
  id: text('id').primaryKey().default(() => createId()),
  userId: text('user_id').notNull(),
  yamlData: jsonb('yaml_data'),
  formFields: jsonb('form_fields'),
  currentTab: text('current_tab').default('personal'),
  accordionValues: jsonb('accordion_values').default({}),
  retrieveMode: text('retrieve_mode').default('new'),
  location: text('location').default('ENGLAND, LONDON'),
  secretQuestion: text('secret_question'),
  secretAnswer: text('secret_answer'),
  applicationId: text('application_id'),
  surname: text('surname'),
  birthYear: text('birth_year'),
  lastUpdated: timestamp('last_updated').defaultNow(),
  createdAt: timestamp('created_at').defaultNow(),
});

export const formVersions = pgTable('form_versions', {
  id: text('id').primaryKey().default(() => createId()),
  userId: text('user_id').notNull(),
  yamlData: jsonb('yaml_data'),
  versionName: text('version_name'),
  createdAt: timestamp('created_at').defaultNow(),
}); 