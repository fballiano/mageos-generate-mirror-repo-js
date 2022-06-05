const repo = require('./repository');
const parseOptions = require('parse-options');
const {setArchiveBaseDir, setMageosPackageRepoUrl} = require('./package-modules');
const {copyAdditionalPackages, processMirrorInstruction} = require('./mirror-build-tools');

const options = parseOptions(
  `$outputDir $gitRepoDir $mirrorUrl @help|h`,
  process.argv
);


if (options.help) {
  console.log(`Build Mage-OS composer packages from github.com/mage-os git repositories.

Usage:
  node src/main [OPTIONS]
  
Options:
  --outputDir=   Dir to contain the built packages (default: packages)
  --gitRepoDir=  Dir to clone repositories into (default: repositories)
  --mirrorUrl=   Composer repository URL to use in base package (default: https://mirror.mage-os.org/)
`);
  process.exit(1);
}

const archiveDir = options.outputDir || 'packages';
setArchiveBaseDir(archiveDir);

if (options.gitRepoDir) {
  repo.setStorageDir(options.gitRepoDir);
}

if (options.mirrorUrl) {
  setMageosPackageRepoUrl(options.mirrorUrl);
}

const mirrorInstructions = [
  {
    repoUrl: 'https://github.com/mage-os/mirror-magento2.git',
    fromTag: '2.4.0',

    magentoCommunityEditionProject: true,
    magentoCommunityEditionMetapackage: true,

    packageDirs: [
      {label: 'Magento Core Modules', dir: 'app/code/Magento'},
      {label: 'Magento Language packages', dir: 'app/i18n/Magento'}
    ],
    packageIndividual: [
      {
        label: 'Magento Base Package',
        dir: '',
        exclude: [".github/", "app/code/", "app/design/frontend/", "app/design/adminhtml/", "app/i18n/", "lib/internal/Magento/Framework/", "composer.lock", "app/etc/vendor_path.php"],
        composerJsonPath: `${__dirname}/../resource/history/magento/magento2-base/template.json`,
        // The directories are required for the magento-composer-installer to properly function, otherwise it doesn't complete processing and app/etc is missing.
        emptyDirsToAdd: ['app/design/frontend/Magento', 'app/design/adminhtml/Magento', 'app/code/Magento', 'app/i18n/Magento', 'lib/internal/Magento'],
      },
      {
        label: 'Magento Framework',
        dir: 'lib/internal/Magento/Framework',
        exclude: ['lib/internal/Magento/Framework/Amqp/', 'lib/internal/Magento/Framework/Bulk/', 'lib/internal/Magento/Framework/MessageQueue/'],
      },
      {
        label: 'Magento Framework_Amqp',
        dir: 'lib/internal/Magento/Framework/Amqp',
      },
      {
        label: 'Magento Framework_Bulk',
        dir: 'lib/internal/Magento/Framework/Bulk',
      },
      {
        label: 'Magento Framework_MessageQueue',
        dir: 'lib/internal/Magento/Framework/MessageQueue',
      },
      {
        label: 'Magento Magento Admin Theme',
        dir: 'app/design/adminhtml/Magento/backend',
      },
      {
        label: 'Magento Magento Blank Theme',
        dir: 'app/design/frontend/Magento/blank',
      },
      {
        label: 'Magento Magento Luma Theme',
        dir: 'app/design/frontend/Magento/luma',
      },
    ],
    packageMetaFromDirs: [],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-security-package.git',
    fromTag: '1.0.0',

    packageDirs: [
      {
        label: 'Security Packages',
        dir: '',
        exclude: ['.github/', '_metapackage/'],
      }
    ],
    packageIndividual: [],
    packageMetaFromDirs: [
      {
        label: 'Security Metapackage',
        dir: '_metapackage',
      }
    ],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-inventory.git',
    fromTag: '1.1.5',

    packageDirs: [
      {
        label: 'Inventory Packages',
        dir: '',
        exclude: ['.github/', '_metapackage/', 'dev/'],
      }
    ],
    packageIndividual: [],
    packageMetaFromDirs: [
      {
        label: 'Inventory Metapackage',
        dir: '_metapackage',
      }
    ],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-inventory-composer-installer.git',
    fromTag: '1.1.0',

    packageDirs: [],
    packageIndividual: [
      {
        label: 'Inventory Composer Installer Package',
        dir: '',
      },
    ],
    packageMetaFromDirs: [],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-magento2-page-builder.git',
    fromTag: '1.7.0',

    packageDirs: [
      {
        label: 'PageBuilder Packages',
        dir: 'app/code/Magento',
        exclude: ['app/code/Magento/_metapackage/'],
      }
    ],
    packageIndividual: [],
    packageMetaFromDirs: [
      {
        label: 'PageBuilder Metapackage',
        dir: 'app/code/Magento/_metapackage',
      },
    ],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-adobe-ims.git',
    fromTag: '2.1.0',

    packageDirs: [
      {
        label: 'Adobe IMS Packages',
        dir: '',
        exclude: ['_metapackage/', '.github/'],
      }
    ],
    packageIndividual: [],
    packageMetaFromDirs: [
      {
        label: 'Adobe IMS Metapackage',
        dir: '_metapackage',
      },
    ],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-adobe-stock-integration.git',
    fromTag: '1.0.0',

    packageDirs: [
      {
        label: 'Stock Integration Packages',
        dir: '',
        exclude: ['_metapackage/', '.github/', 'dev/'],
      }
    ],
    packageIndividual: [],
    packageMetaFromDirs: [
      {
        label: 'Adobe Stock Integration Metapackage',
        dir: '_metapackage',
      },
    ],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-composer-root-update-plugin.git',
    fromTag: '1.0.0',

    packageDirs: [],
    packageIndividual: [
      {
        label: 'Magento Composer Root Update Plugin',
        dir: 'src/Magento/ComposerRootUpdatePlugin',
      }
    ],
    packageMetaFromDirs: [],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-composer-dependency-version-audit-plugin.git',
    fromTag: '1.2.0',

    packageDirs: [],
    packageIndividual: [
      {
        label: 'Magento Composer Dependency Version Audit Plugin',
        dir: '',
      }
    ],
    packageMetaFromDirs: [],
  },
  {
    repoUrl: 'https://github.com/mage-os/mirror-magento2-sample-data.git',
    fromTag: '2.4.0',

    packageDirs: [
      {
        label: 'Community Edition Sample Data',
        dir: 'app/code/Magento',
      }
    ],
    packageIndividual: [
      {
        label: 'Community Edition Sample Data Media',
        dir: 'pub/media',
      }
    ],
    packageMetaFromDirs: [],
  },
];

(async () => {
  for (const instruction of mirrorInstructions) {
    await processMirrorInstruction(instruction);
  }
  await copyAdditionalPackages(archiveDir);
})()
