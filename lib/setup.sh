#!/bin/bash
cd /tmp
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.2.zip
unzip apache-jmeter-5.6.2.zip -d /opt
wget https://cioe.s3.amazonaws.com/marketing/LambdaConcurrencyLimits.jmx
sudo dnf install java -y
java -version
sudo dnf install httpd -y
systemctl start httpd
echo "<h1>Greetings AWS builders</h1>" > /var/www/html/index.html
sudo mkdir /var/www/html/stats
sudo chmod 777 -R /var/www/html/stats
sudo dnf install -y pip gcc python-devel python3-devel
mkdir -p /home/ec2-user
cd /home/ec2-user
aws s3 cp s3://${asset.s3BucketName}/${asset.s3ObjectKey} /home/ec2-user/
chmod 644 ${destinationPath}
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xvf apache-jmeter-5.6.3.tgz
echo 'export PATH=/home/ec2-user/apache-jmeter-5.6.3/bin:$PATH' >> ./.bashrc



    