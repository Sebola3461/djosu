# Creating a new command

## Structure

```md
-   /commands
    -   <MainCommand>.ts
        -   /subcommands
            -   /<MainCommand>
                -   Subcommand
```

## Inside a command file

To create commands, we use our custom system called DynamicCommands.

### Using DynamicCommands command handler

#### Creating a command

1. Create the main command file in `/commands`
   Example: `/commands/ping.ts`

2. Create the skeleton of the command (see [DynamicCommands wiki](/wiki/dynamiccommands/getstarted))

3. Save it!
