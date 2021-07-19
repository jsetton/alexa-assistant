# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Deployment Steps

0. Prerequisites

    * To deploy this skill, you will need the following tools:
        * [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html)
        * [Docker](https://docs.docker.com/get-docker/)

    * Setup your Google environment by only following the [Google-related](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/fresh_install.md#enable-google-assistant-api-) installation instructions, skipping all Amazon Alexa-related steps. Once completed, follow the below steps to get a Google Maps API key:
        * Enable the [Google Maps Geocoding API](https://console.cloud.google.com/apis/library/geocoding-backend.googleapis.com) under the same project.
        * Create a new [API key credential](https://console.cloud.google.com/apis/credentials) and edit it:
            * Change name to `alexa_google_assistant`
            * Leave application restrictions to none
            * Set API restrictions to the Geocoding API only.

    * If upgrading from v2:
        * Create ask directory and states file adding the skill id listed under your [Alexa developer console](https://developer.amazon.com/alexa/console/ask). This will prevent duplicate skills from being created under your account.
        ```
        $ cat .ask/ask-states.json
        {
          "askcliStatesVersion": "2020-03-31",
          "profiles": {
            "default": {
              "skillId": "<skillId>"
            }
          }
        }
        ```
      * Remove your existing cloudformation stack

    * If your default language isn't English (US):
        * Configure your [AWS region](https://developer.amazon.com/en-US/docs/alexa/smarthome/develop-smart-home-skills-in-multiple-languages.html#deploy) to deploy to in [`ask-resources.json`](ask-resources.json).
        * Add your specific skill locale:
        ```
        $ ask skill add-locales
        ? Please select at least one locale to add: en-GB

        The following skill locale(s) have been added according to your local project:
          Added locale en-GB.json from en-US's interactionModel
        Please check the added files above, and run "ask deploy" to deploy the changes.
        ```

    * Configure your Google Project ID  `GoogleProjectId` and Google Maps API key `GoogleMapsApiKey` in [`ask-resources.json`](ask-resources.json) by setting the skill infrastructure cloudformation user config parameters. To enable debug logs, configure `LambdaDebug` to `true`.

    * Configure your Google Assistant API `clientId` and `clientSecret` in [`skill-package/accountLinking.json`](skill-package/accountLinking.json)

1. Deploy the skill and the lambda function in one step:
    ```
    $ ask deploy
    Deploy configuration loaded from ask-resources.json
    Deploy project for profile [default]

    ==================== Deploy Skill Metadata ====================
    Skill package deployed successfully.
    Skill ID: <skillId>

    ==================== Build Skill Code ====================
    Skill code built successfully.
    Code for region default built to <skillPath>/.ask/lambda/build.zip successfully with build flow CustomBuildFlow.

    ==================== Deploy Skill Infrastructure ====================
    ✔ Deploy Alexa skill infrastructure for region "default"
    The api endpoints of skill.json have been updated from the skill infrastructure deploy results.
    Skill infrastructures deployed successfully through @ask-cli/cfn-deployer.

    ==================== Enable Skill ====================
    Skill is enabled successfully.
    ```

2. Setup skill account linking using the skill id displayed in previous step and your OAuth2 provider configuration:
    ```
    $ ask smapi update-account-linking-info -s <skillId> --account-linking-request file:skill-package/accountLinking.json

    Command executed successfully!
    ```

3. Enable skill with account linking:
    * Go to your [Alexa skill console](https://alexa.amazon.com/spa/index.html#skills/your-skills/?ref-suffix=ysa_gw)
    * Click on the "Google Assistant" skill under the "Dev Skills" tab
    * Click "Enable", activate the "Device Country and Postal Code" permission and go through the account linking process

# Release 3.0

### THIS SKILL IS FOR PERSONAL USE ONLY AND IS NOT ENDORSED BY GOOGLE OR AMAZON. WHILST THIS SKILL USES AN OFFICIAL GOOGLE API, IT WILL NEVER PASS AMAZON CERTIFICATION DUE TO THE WAY THE RESPONSES ARE HOSTED.


# What's New in this release

1. Supports node.js 12
2. Supports for ask-cli deployment all-in-one skill and cloudformation stack with local building
3. Added support for device location converting Alexa skill device postal code/country to location coordinates using Google Maps Geocode API
4. Increased supported locales list
5. Replaced deprecated render template interface with simple cards display when text response available
6. No longer need to upload `client_secret.json` as replaced by Lambda environmental variables
7. Refactor code separating functionalities and upgrading to ask sdk v2
