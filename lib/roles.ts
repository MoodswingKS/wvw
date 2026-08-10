export type Alignment = "VILLAGE" | "WEREWOLF";

export interface RoleInfo {
  id: "VILLAGER" | "WEREWOLF" | "SEER" | "DOCTOR";
  name: string;
  alignment: Alignment;
  tagline: string;
  ability: string;
  countRule: string;
}

export const roles: RoleInfo[] = [
  {
    id: "VILLAGER",
    name: "Villager",
    alignment: "VILLAGE",
    tagline: "No powers. Just a vote and good instincts.",
    ability:
      "Acts only in the day phase, by voting to lynch whoever the village suspects. Wins when every werewolf is gone.",
    countRule: "Fills every seat not taken by another role.",
  },
  {
    id: "WEREWOLF",
    name: "Werewolf",
    alignment: "WEREWOLF",
    tagline: "Hidden among the village, hunting by night.",
    ability:
      "Each night, the werewolves choose one player to eliminate. During the day they pass as ordinary villagers.",
    countRule: "Roughly 1 in every 4 players.",
  },
  {
    id: "SEER",
    name: "Seer",
    alignment: "VILLAGE",
    tagline: "Sees what others can't.",
    ability:
      "Each night, checks one player and learns whether they're a werewolf. Says nothing out loud — the information is only as good as what the Seer does with it by day.",
    countRule: "One per game.",
  },
  {
    id: "DOCTOR",
    name: "Doctor",
    alignment: "VILLAGE",
    tagline: "Keeps one person alive till morning.",
    ability:
      "Each night, protects one player from the werewolves' kill. Can protect themselves, but not the same person two nights running.",
    countRule: "One per game.",
  },
];
