import { getCurrentTimeDef, getCurrentTimeFn } from "./get_current_time.js";
import {
  gmailListMessagesDef,
  gmailListMessagesFn,
  calendarListEventsDef,
  calendarListEventsFn,
} from "./google_workspace.js";
import {
  searchSkillsDef,
  searchSkillsFn,
  getSkillDef,
  getSkillFn,
  installSkillDef,
  installSkillFn,
} from "./skill_lookup.js";

import {
  searchWebDef,
  searchWebFn,
} from "./web_search.js";

import {
  queryMeetingsDef,
  queryMeetingsFn,
} from "./read_ai_query.js";

import {
  slackListChannelsDef,
  slackListChannelsFn,
  slackReadMessagesDef,
  slackReadMessagesFn,
} from "./slack.js";
import { airtableQueryDef, airtableQueryFn } from "./airtable.js";

// Tool definition to send to the LLM
export const toolsDefinition = [
  getCurrentTimeDef,
  gmailListMessagesDef,
  calendarListEventsDef,
  searchSkillsDef,
  getSkillDef,
  installSkillDef,
  searchWebDef,
  queryMeetingsDef,
  slackListChannelsDef,
  slackReadMessagesDef,
  airtableQueryDef,
];

// Map of tool names to their execution functions
export const toolsExecutor: Record<
  string,
  (args: any) => Promise<string> | string
> = {
  get_current_time: getCurrentTimeFn,
  gmail_list_messages: gmailListMessagesFn,
  calendar_list_events: calendarListEventsFn,
  search_skills: searchSkillsFn,
  get_skill: getSkillFn,
  install_skill: installSkillFn,
  search_web: searchWebFn,
  query_meetings: queryMeetingsFn,
  slack_list_channels: slackListChannelsFn,
  slack_read_messages: slackReadMessagesFn,
  airtable_query_records: airtableQueryFn,
};

