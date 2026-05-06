import common from '../resources/zh-TW/common.json';
import feedback from '../resources/zh-TW/feedback.json';
import home from '../resources/zh-TW/home.json';
import initSetup from '../resources/zh-TW/initSetup.json';
import links from '../resources/zh-TW/links.json';
import niconiCommons from '../resources/zh-TW/niconiCommons.json';
import nav from '../resources/zh-TW/nav.json';
import packageDetail from '../resources/zh-TW/packageDetail.json';
import registerForm from '../resources/zh-TW/register/form.json';
import registerInstaller from '../resources/zh-TW/register/installer.json';
import registerVersions from '../resources/zh-TW/register/versions.json';
import registerWorkflow from '../resources/zh-TW/register/workflow.json';
import settings from '../resources/zh-TW/settings.json';
import updates from '../resources/zh-TW/updates.json';
import { mergeRegisterResources, type LocaleResourceSchema } from '../resources';

const resources = {
  common,
  nav,
  home,
  package: packageDetail,
  updates,
  settings,
  feedback,
  initSetup,
  links,
  niconiCommons,
  register: mergeRegisterResources(registerWorkflow, registerForm, registerInstaller, registerVersions),
} as const satisfies LocaleResourceSchema;

export default resources;
