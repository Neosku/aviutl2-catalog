import common from '../resources/ko/common.json';
import feedback from '../resources/ko/feedback.json';
import home from '../resources/ko/home.json';
import initSetup from '../resources/ko/initSetup.json';
import links from '../resources/ko/links.json';
import niconiCommons from '../resources/ko/niconiCommons.json';
import nav from '../resources/ko/nav.json';
import packageDetail from '../resources/ko/packageDetail.json';
import registerForm from '../resources/ko/register/form.json';
import registerInstaller from '../resources/ko/register/installer.json';
import registerVersions from '../resources/ko/register/versions.json';
import registerWorkflow from '../resources/ko/register/workflow.json';
import settings from '../resources/ko/settings.json';
import updates from '../resources/ko/updates.json';
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
