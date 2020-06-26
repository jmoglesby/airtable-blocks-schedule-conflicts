import React from 'react';
import { Heading, Text, Box } from '@airtable/blocks/ui';

function PersonNameLink(props) {
  return (
    <Box borderRadius="large">
      <Heading marginBottom={-1}>{props.person.getCellValue("Name")}</Heading>
      <Text textColor="light" fontWeight={300} paddingLeft={3}>conflicts:</Text>
    </Box>
  );
}

export default PersonNameLink;
