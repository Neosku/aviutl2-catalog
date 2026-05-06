import common from '../resources/ja/common.json';
import feedback from '../resources/ja/feedback.json';
import home from '../resources/ja/home.json';
import initSetup from '../resources/ja/initSetup.json';
import links from '../resources/ja/links.json';
import niconiCommons from '../resources/ja/niconiCommons.json';
import nav from '../resources/ja/nav.json';
import packageDetail from '../resources/ja/packageDetail.json';
import registerForm from '../resources/ja/register/form.json';
import registerInstaller from '../resources/ja/register/installer.json';
import registerVersions from '../resources/ja/register/versions.json';
import registerWorkflow from '../resources/ja/register/workflow.json';
import settings from '../resources/ja/settings.json';
import updates from '../resources/ja/updates.json';
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
