# alexa-assistant

Implementation of the Google Assistant API for Alexa

# Download Release

You can download the ZIP file from the [Releases](https://github.com/rokmohar/alexa-assistant/releases)
page and upload them to the AWS Lambda function from the AWS console.

# Deployment Steps

0. Prerequisites

    * To deploy this skill, you will need the following tools:
        * [ASK CLI](https://developer.amazon.com/en-US/docs/alexa/smapi/quick-start-alexa-skills-kit-command-line-interface.html)
        * [Docker](https://docs.docker.com/get-docker/)
        * [AWS CLI](https://docs.aws.amazon.com/cli/latest/userguide/install-cliv2.html) (Optional)

    * If your default language isn't English (US):
        * Configure your [AWS region](https://developer.amazon.com/en-US/docs/alexa/smarthome/develop-smart-home-skills-in-multiple-languages.html#deploy) to deploy to in `ask-resources.json`.
        * Add your specific skill locale:
        ```
        $ ask skill add-locales
        ? Please select at least one locale to add: en-GB

        The following skill locale(s) have been added according to your local project:
          Added locale en-GB.json from en-US's interactionModel
        Please check the added files above, and run "ask deploy" to deploy the changes.
        ```

    * Configure your Google Assistant API `clientId` and `clientSecret` in `skill-package/accountLinking.json`

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
    Code for region default built to <fullPath>/.ask/lambda/build.zip successfully with build flow CustomBuildFlow.

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

3. Retrieve the S3 bucket name from `.ask/ask-states.json` and upload `client_secret.json` to it, directly via the [web console](https://s3.console.aws.amazon.com/s3/home) or using the AWS CLI:
    ```
    $ aws s3 cp client_secret.json s3://<bucketName>
    upload: ./client_secret.json to s3://<bucketName>/client_secret.json
    ```

4. Enable skill with account linking:
    * Go to your [Alexa skill console](https://alexa.amazon.com/spa/index.html#skills/your-skills/?ref-suffix=ysa_gw)
    * Click on the "Google Assistant" skill under the "Dev Skills" tab
    * Click "Enable" and go through the account linking process

# Release 2.1

### THIS SKILL IS FOR PERSONAL USE ONLY AND IS NOT ENDORSED BY GOOGLE OR AMAZON. WHILST THIS SKILL USES AN OFFICIAL GOOGLE API, IT WILL NEVER PASS AMAZON CERTIFICATION DUE TO THE WAY THE RESPONSES ARE HOSTED.


# What's New in this release

1. Supports latest Google Assistant API
2. No longer uses Amazon Polly so should be completely free to use within the Free AWS Tier
3. Supports languages other than US English via configuration in Google Assistant mobile app
4. Supports localisation, again via Google Assistant mobile app
5. Added support for devices with screen like the Show and Spot - this will display text responses when available
6. Lambda function is now deployed via a hosted cloudformation config. This means you don't need to download the skill code from github and most of the settings are automatically configured. It should make upgrading the skill easier in the future

# Why do I need a credit card?

The skill is hosted on AWS which is an Amazon service. The usage of this skill is free for many thousands of requests however Amazon still require a credit card incase you start using their services beyond the free limits. Your credit card details stay with Amazon - neither I nor any other developers can access them.

There is no way around this. If you don't want to give your credit card details to Amazon then you cannot install and run this skill - sorry

# Sites reproducing installation instructions

The skill software in this GitHub project is provided as open source so you are welcome to distribute and modify as per the [GNU General Public License v3.0](LICENSE)

I do however have to pay the costs of hosting the cloudformation templates and zip files on AWS S3. As such the instructions for deploying this skill and the CloudFormation template linked within are now held in a seperate [GitHub project](https://github.com/tartanguru/alexa-assistant-instructions) which is licenced under a [Creative Commons Attribution-NonCommercial-NoDerivatives 4.0 International License](http://creativecommons.org/licenses/by-nc-nd/4.0/)

If you wish to reproduce the installation instructions hosted on your own website (**I really wish you wouldn't as it makes my life very difficult to support and update the skill**) then you may do so and link to my Cloudformation template (and consequently the zips on my S3 buckets)  provided that there is no monetisation on the page e.g. adverts. If you do wish to have monetisation then you will need to create your own instructions and host your own Cloudformation template and associated zip files.

I AM VERY SERIOUS ABOUT THIS POINT - I WILL BE CHECKING FREQUENTLY AND WILL CHANGE OR REMOVE THE CLOUDFORMATION TEMPLATE URL IF PEOPLE ARE ABUSING IT

NOTE: I have granted Paul Hibbert the rights to link to the Cloudformation for the purposes of his installation videos

# Upgrading from version 1 of the skill

If you already have the original version of the skill which was installed manuallly WITHOUT using Cloudformation then please read the upgrade instructions here:-

[Upgrade Instructions](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/upgrade.md)

# New Installation via CloudFormation

This is the easiest method as it creates the lambda function automatically for you.

NOTE - PLEASE ONLY USE THE CLOUDFORMATION TEMPLATE URL PROVIDED IN THE INSTRUCTIONS ON THIS GITHUB SITE OR PAUL HIBBERTS VIDEO.
I CANNOT GUARANTEE THE SAFETY OF URLS GIVEN ON OTHER SITES

If you have not installed the skill before then follow the instructions here:-

[Installation Instructions](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/fresh_install.md)

Otherwise watch Paul Hibberts excellent installation video here:-

[Installation video](https://www.youtube.com/watch?v=saN_N30kPc4)

https://www.youtube.com/watch?v=saN_N30kPc4

# IT DOESN'T WORK / PROBLEM SOLVING

**BEFORE RAISING A QUESTION PLEASE CHECK THE PROBLEM SOLVING PAGE [HERE](https://github.com/tartanguru/alexa-assistant-instructions/blob/master/common_problems.md)**

I get asked the same questions many times a day and most of them due are missing steps in the instructions

# CREDITS

Paul Hibbert for producing the installation video.

Richard Vowles for his Typescript based Google Assistant client which gave me some pointers on getting the API running in pure node.js https://github.com/rvowles/node-assistant

John JDuo, Pete Bready and Mark Riley for proof reading previous installation instructions and testing beta versions.

@groky and @prestomation for for their pointers in moving to a CloudFormation deployment of the skills Lambda code

# CAN I BUY YOU A BEER?

Thanks but I'm not in it for the money nor do I drink beer, but if you do find this skill usefull then please consider making a small donation to Pancreatic Cancer UK who have helped my family recently:-

https://www.pancreaticcancer.org.uk/donate/single-donation/

If you are in the US then feel free to donate to the National Pancreatice Cancer Foundation:-

http://www.npcf.us/donate/

If you live elsewhere in the world then please donate a local cancer charity
