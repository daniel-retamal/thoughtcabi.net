import type { ProviderId } from "@/domain/sync/types";
import type { Copy } from "@/i18n/copy";

export const TOKEN_PAGE = "https://github.com/settings/personal-access-tokens/new";

export interface ConnectField {
  name: string;
  label: string;
  hint?: string;
  placeholder?: string;
  secret?: boolean;
  link?: string;
  linkLabel?: string;
}

function githubFields(fields: Copy["sync"]["fields"]): ConnectField[] {
  return [
    { name: "owner", label: fields.owner, hint: fields.ownerHint, placeholder: "danielr" },
    { name: "repo", label: fields.repo, placeholder: "cabinet" },
    {
      name: "token",
      label: fields.token,
      hint: fields.tokenHint,
      placeholder: "github_pat_…",
      secret: true,
      link: TOKEN_PAGE,
      linkLabel: fields.tokenLink,
    },
    {
      name: "path",
      label: fields.path,
      hint: fields.pathHint,
      placeholder: "thoughtcabinet.json",
    },
  ];
}

function webdavFields(fields: Copy["sync"]["fields"]): ConnectField[] {
  return [
    {
      name: "url",
      label: fields.address,
      hint: fields.addressHint,
      placeholder: "https://cloud.example.com/remote.php/dav/files/you/",
    },
    { name: "user", label: fields.user, placeholder: "you" },
    {
      name: "password",
      label: fields.password,
      hint: fields.passwordHint,
      secret: true,
    },
  ];
}

export function connectFieldsFor(provider: ProviderId, copy: Copy): ConnectField[] {
  const fields = copy.sync.fields;

  if (provider === "github") return githubFields(fields);
  if (provider === "webdav") return webdavFields(fields);
  return [];
}
