#!/bin/bash
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
aws s3 cp ${s3UriAsset1} ./${originalFileName1}
aws s3 cp ${s3UriAsset2} ./${originalFileName2}
wget https://dlcdn.apache.org//jmeter/binaries/apache-jmeter-5.6.3.tgz
tar -xvf apache-jmeter-5.6.3.tgz
chown -R ec2-user:ec2-user ./*
echo 'export PATH=/home/ec2-user/apache-jmeter-5.6.3/bin:$PATH' >> ./.bashrc
echo 'export APIURL=${apiEndpoint}' >> ./.bashrc



    