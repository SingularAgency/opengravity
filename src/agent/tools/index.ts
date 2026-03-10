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

// Tool definition to send to the LLM
export const toolsDefinition = [
  getCurrentTimeDef,
  gmailListMessagesDef,
  calendarListEventsDef,
  searchSkillsDef,
  getSkillDef,
  installSkillDef,
  searchWebDef,
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
};


