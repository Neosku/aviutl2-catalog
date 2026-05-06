import common from '../resources/zh-CN/common.json';
import feedback from '../resources/zh-CN/feedback.json';
import home from '../resources/zh-CN/home.json';
import initSetup from '../resources/zh-CN/initSetup.json';
import links from '../resources/zh-CN/links.json';
import niconiCommons from '../resources/zh-CN/niconiCommons.json';
import nav from '../resources/zh-CN/nav.json';
import packageDetail from '../resources/zh-CN/packageDetail.json';
import registerForm from '../resources/zh-CN/register/form.json';
import registerInstaller from '../resources/zh-CN/register/installer.json';
import registerVersions from '../resources/zh-CN/register/versions.json';
import registerWorkflow from '../resources/zh-CN/register/workflow.json';
import settings from '../resources/zh-CN/settings.json';
import updates from '../resources/zh-CN/updates.json';
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
