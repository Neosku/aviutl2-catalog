import common from '../resources/en/common.json';
import feedback from '../resources/en/feedback.json';
import home from '../resources/en/home.json';
import initSetup from '../resources/en/initSetup.json';
import links from '../resources/en/links.json';
import niconiCommons from '../resources/en/niconiCommons.json';
import nav from '../resources/en/nav.json';
import packageDetail from '../resources/en/packageDetail.json';
import registerForm from '../resources/en/register/form.json';
import registerInstaller from '../resources/en/register/installer.json';
import registerVersions from '../resources/en/register/versions.json';
import registerWorkflow from '../resources/en/register/workflow.json';
import settings from '../resources/en/settings.json';
import updates from '../resources/en/updates.json';
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
