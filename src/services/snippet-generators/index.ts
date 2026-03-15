/**
 * Barrel export: importing this module registers all snippet generators.
 */

// Core generators
import './generator-curl';
import './generator-javascript-fetch';
import './generator-python-requests';

// Additional generators
import './generator-javascript-axios';
import './generator-go-native';
import './generator-java-httpurlconnection';
import './generator-java-okhttp';
import './generator-php-curl';
import './generator-csharp-httpclient';
import './generator-ruby-net-http';
import './generator-swift-urlsession';
import './generator-kotlin-okhttp';
import './generator-dart-http';
import './generator-rust-reqwest';
import './generator-powershell';
import './generator-httpie';

// Re-export registry API
export {
  generateSnippet,
  SNIPPET_LANGUAGES,
  type SnippetLanguage,
  type SnippetGenerator,
} from './snippet-generator-registry';
