import React from 'react';
import { Heading, Text } from '@airtable/blocks/ui';

function PersonNameLink(props) {
  return (
    <div>
      <Heading marginBottom={-1}>{props.person.getCellValue("Name")}</Heading>
      <Text textColor="light" fontWeight={300} paddingLeft={3}>conflicts:</Text>
    </div>
  );
}

export default PersonNameLink;
