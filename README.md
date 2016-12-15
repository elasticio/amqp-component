# pubsub-component [![NPM version][npm-image]][npm-url] [![Build Status][travis-image]][travis-url] [![Dependency Status][daviddm-image]][daviddm-url]
> Pub/Sub Component for async communication with queues and topics

# pubsub-component
PubSub component for the [elastic.io platform](http://www.elastic.io &#34;elastic.io platform&#34;)

If you plan to **deploy it into [elastic.io platform](http://www.elastic.io &#34;elastic.io platform&#34;) you must follow sets of instructions to succseed**. 

## Before you Begin

Before you can deploy any code into elastic.io **you must be a registered elastic.io platform user**. Please see our home page at [http://www.elastic.io](http://www.elastic.io) to learn how. 

We will use git and SSH public key authentication to upload your component code, therefore you must **[upload your SSH Key](http://docs.elastic.io/docs/ssh-key)**. 

If you fail to upload you SSH Key you will get **permission denied** error during the deployment.

## Getting Started

After registration and uploading of your SSH Key you can proceed to deploy it into our system. At this stage we suggest you to:
* [Create a team](http://docs.elastic.io/docs/teams) to work on your new component. This is not required but will be automatically created using random naming by our system so we suggest you name your team accordingly.
* [Create a repository](http://docs.elastic.io/docs/component-repositories) where your new component is going to *reside* inside the team that you have just created.

Now as you have a team name and component repository name you can add a new git remote where code shall be pushed to. It is usually displayed on the empty repository page:

```bash
$ git remote add elasticio your-team@git.elastic.io:your-repository.git
```

Obviously the naming of your team and repository is entirely upto you and if you do not put any corresponding naming our system will auto generate it for you but the naming might not entirely correspond to your project requirements.
Now we are ready to push it:

```bash
$ git push elasticio master
```

## Authentication

This component is using the internal RabbitMQ instance that is available as part of elastic.io
infrastructure, it expects following environment variables to be present when started:
* ``ELASTICIO_AMQP_URI`` something like ``amqp://foo:bar@server``
* ``ELASTICIO_MESSAGE_CRYPTO_IV`` vector for symmetric encryption
* ``ELASTICIO_MESSAGE_CRYPTO_PASSWORD`` password for symmetric encryption
* ``ELASTICIO_TASK_ID`` ID of the currently running task, used to construct name for exchange
* ``ELASTICIO_USER_ID`` ID of the current user, used to construct name of the exchange

 
## Known issues

No known issues are there yet.


## License

Apache-2.0 © [elastic.io GmbH](https://elastic.io)


[npm-image]: https://badge.fury.io/js/pubsub-component.svg
[npm-url]: https://npmjs.org/package/pubsub-component
[travis-image]: https://travis-ci.org/elasticio/pubsub-component.svg?branch=master
[travis-url]: https://travis-ci.org/elasticio/pubsub-component
[daviddm-image]: https://david-dm.org/elasticio/pubsub-component.svg?theme=shields.io
[daviddm-url]: https://david-dm.org/elasticio/pubsub-component
